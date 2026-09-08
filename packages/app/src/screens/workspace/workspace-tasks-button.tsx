import { useCallback, useMemo, useState, type ReactElement } from "react";
import { Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ListTodo, Play, Plus } from "lucide-react-native";
import { StyleSheet } from "react-native-unistyles";
import type { TaskPayload } from "@getpaseo/protocol/messages";
import { AdaptiveModalSheet, AdaptiveTextInput } from "@/components/adaptive-modal-sheet";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/contexts/toast-context";
import { useSessionStore } from "@/stores/session-store";
import { generateMessageId } from "@/types/stream";
import { useFetchQuery } from "@/data/query";

interface WorkspaceTasksButtonProps {
  serverId: string;
  workspaceId: string;
  presentation?: "default" | "ghost";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Task operation failed";
}

function TaskCard({
  task,
  verifyPending,
  verifyingTaskId,
  startPending,
  startingTaskId,
  acceptPending,
  acceptingTaskId,
  onVerify,
  onStart,
  onAccept,
}: {
  task: TaskPayload;
  verifyPending: boolean;
  verifyingTaskId?: string;
  startPending: boolean;
  startingTaskId?: string;
  acceptPending: boolean;
  acceptingTaskId?: string;
  onVerify: (taskId: string) => void;
  onStart: (task: TaskPayload) => void;
  onAccept: (task: TaskPayload) => void;
}): ReactElement {
  const handleVerify = useCallback(() => onVerify(task.id), [onVerify, task.id]);
  const handleStart = useCallback(() => onStart(task), [onStart, task]);
  const handleAccept = useCallback(() => onAccept(task), [onAccept, task]);
  const passed = task.latestEvidence?.status === "passed";
  const canVerify = ["running", "failed", "review_ready"].includes(task.status);
  return (
    <View style={styles.taskCard} testID={`workspace-task-${task.id}`}>
      <View style={styles.taskHeader}>
        <View style={styles.taskTitleGroup}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text style={styles.taskMeta}>{task.status.replaceAll("_", " ")}</Text>
        </View>
        {passed ? <CheckCircle2 size={18} color={styles.success.color} /> : null}
      </View>
      {task.prompt ? <Text style={styles.prompt}>{task.prompt}</Text> : null}
      <Text style={styles.command}>{task.check.command}</Text>
      {task.latestEvidence ? (
        <Text style={task.latestEvidence.status === "passed" ? styles.success : styles.error}>
          {task.latestEvidence.status} · {task.latestEvidence.durationMs ?? 0} ms · snapshot{" "}
          {task.latestEvidence.snapshot?.id.slice(0, 8) ?? "unavailable"} ·{" "}
          {task.latestEvidence.isolation.replaceAll("_", " ")}
        </Text>
      ) : null}
      <View style={styles.actions}>
        {task.status === "queued" ? (
          <Button
            size="sm"
            leftIcon={Play}
            loading={startPending && startingTaskId === task.id}
            disabled={startPending}
            onPress={handleStart}
          >
            Start
          </Button>
        ) : null}
        {canVerify ? (
          <Button
            size="sm"
            leftIcon={CheckCircle2}
            loading={verifyPending && verifyingTaskId === task.id}
            disabled={verifyPending}
            onPress={handleVerify}
          >
            Verify
          </Button>
        ) : null}
        {task.status === "review_ready" ? (
          <Button
            size="sm"
            variant="default"
            loading={acceptPending && acceptingTaskId === task.id}
            disabled={acceptPending}
            onPress={handleAccept}
          >
            Accept
          </Button>
        ) : null}
      </View>
    </View>
  );
}

export function WorkspaceTasksButton({
  serverId,
  workspaceId,
  presentation = "default",
}: WorkspaceTasksButtonProps): ReactElement | null {
  const client = useSessionStore((state) => state.sessions[serverId]?.client ?? null);
  const supported = useSessionStore(
    (state) => state.sessions[serverId]?.serverInfo?.features?.tasksV1 === true,
  );
  const toast = useToast();
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [command, setCommand] = useState("npm test");
  const queryKey = useMemo(
    () => ["orqara-tasks", serverId, workspaceId] as const,
    [serverId, workspaceId],
  );

  const tasksQuery = useFetchQuery({
    queryKey,
    enabled: visible && Boolean(client),
    dataShape: "list",
    staleTimeMs: 0,
    refetchInterval: 1_000,
    queryFn: async () => {
      if (!client) throw new Error("Daemon client unavailable");
      const result = await client.listTasks(workspaceId);
      if (result.error) throw new Error(result.error);
      return result.tasks;
    },
  });

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey }),
    [queryClient, queryKey],
  );

  const createTask = useMutation({
    mutationFn: async () => {
      if (!client) throw new Error("Daemon client unavailable");
      const result = await client.createTask({
        workspaceId,
        title: title.trim(),
        prompt: prompt.trim(),
        providerId: "codex",
        acceptanceCriteria: ["Required verification check passes"],
        checks: [{ id: "required", command: command.trim(), timeoutMs: 10 * 60 * 1000 }],
        commandId: generateMessageId(),
      });
      if (result.error || !result.task) throw new Error(result.error ?? "Task was not created");
      return result.task;
    },
    onSuccess: () => {
      setTitle("");
      setPrompt("");
      void refresh();
    },
    onError: (error) => toast.show(errorMessage(error), { variant: "error" }),
  });

  const verifyTask = useMutation({
    mutationFn: async (taskId: string) => {
      if (!client) throw new Error("Daemon client unavailable");
      const result = await client.verifyTask({
        workspaceId,
        taskId,
        commandId: generateMessageId(),
      });
      if (result.error || !result.task) throw new Error(result.error ?? "Verification failed");
      return result.task;
    },
    onSuccess: () => void refresh(),
    onError: (error) => toast.show(errorMessage(error), { variant: "error" }),
  });

  const startTask = useMutation({
    mutationFn: async (task: TaskPayload) => {
      if (!client) throw new Error("Daemon client unavailable");
      const result = await client.commandTask({
        workspaceId,
        taskId: task.id,
        commandId: generateMessageId(),
        expectedRevision: task.revision,
        action: "start",
      });
      if (result.error || !result.task) throw new Error(result.error ?? "Task was not started");
      return result.task;
    },
    onSuccess: () => void refresh(),
    onError: (error) => toast.show(errorMessage(error), { variant: "error" }),
  });

  const acceptTask = useMutation({
    mutationFn: async (task: TaskPayload) => {
      if (!client) throw new Error("Daemon client unavailable");
      const result = await client.commandTask({
        workspaceId,
        taskId: task.id,
        commandId: generateMessageId(),
        expectedRevision: task.revision,
        action: "accept",
      });
      if (result.error || !result.task) throw new Error(result.error ?? "Task was not accepted");
      return result.task;
    },
    onSuccess: () => void refresh(),
    onError: (error) => toast.show(errorMessage(error), { variant: "error" }),
  });

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  const submit = useCallback(() => createTask.mutate(), [createTask]);
  const runVerify = useCallback((taskId: string) => verifyTask.mutate(taskId), [verifyTask]);
  const runStart = useCallback((task: TaskPayload) => startTask.mutate(task), [startTask]);
  const runAccept = useCallback((task: TaskPayload) => acceptTask.mutate(task), [acceptTask]);
  const sheetHeader = useMemo(
    () => ({ title: "Tasks", subtitle: "Run work against explicit acceptance evidence." }),
    [],
  );
  const tasks = tasksQuery.data ?? [];
  if (!supported) return null;

  return (
    <>
      <Button
        accessibilityLabel="Open tasks"
        testID="workspace-tasks-button"
        variant={presentation === "ghost" ? "ghost" : "outline"}
        size="xs"
        leftIcon={ListTodo}
        onPress={open}
      >
        {presentation === "ghost" ? null : "Tasks"}
      </Button>
      <AdaptiveModalSheet
        visible={visible}
        onClose={close}
        header={sheetHeader}
        testID="workspace-tasks-sheet"
        desktopMaxWidth={680}
      >
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>New task</Text>
          <AdaptiveTextInput
            initialValue={title}
            resetKey={title === "" ? "empty-title" : undefined}
            onChangeText={setTitle}
            placeholder="Task title"
            accessibilityLabel="Task title"
            style={styles.input}
          />
          <AdaptiveTextInput
            initialValue={prompt}
            resetKey={prompt === "" ? "empty-prompt" : undefined}
            onChangeText={setPrompt}
            placeholder="What should the agent accomplish?"
            accessibilityLabel="Task prompt"
            multiline
            style={styles.promptInput}
          />
          <Text style={styles.label}>Required check · runs in a disposable checkout</Text>
          <AdaptiveTextInput
            initialValue={command}
            onChangeText={setCommand}
            placeholder="npm test"
            accessibilityLabel="Required verification command"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <Button
            variant="default"
            leftIcon={Plus}
            disabled={!title.trim() || !prompt.trim() || !command.trim()}
            loading={createTask.isPending}
            onPress={submit}
          >
            Create task
          </Button>
        </View>

        <View style={styles.list}>
          <Text style={styles.sectionTitle}>Workspace tasks</Text>
          {tasksQuery.isLoading ? <LoadingSpinner color={styles.muted.color} size="small" /> : null}
          {tasksQuery.error ? (
            <Text style={styles.error}>{errorMessage(tasksQuery.error)}</Text>
          ) : null}
          {!tasksQuery.isLoading && tasks.length === 0 ? (
            <Text style={styles.empty}>No tasks yet.</Text>
          ) : null}
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              verifyPending={verifyTask.isPending}
              verifyingTaskId={verifyTask.variables}
              startPending={startTask.isPending}
              startingTaskId={startTask.variables?.id}
              acceptPending={acceptTask.isPending}
              acceptingTaskId={acceptTask.variables?.id}
              onVerify={runVerify}
              onStart={runStart}
              onAccept={runAccept}
            />
          ))}
        </View>
      </AdaptiveModalSheet>
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  form: { gap: theme.spacing[3], paddingBottom: theme.spacing[6] },
  list: { gap: theme.spacing[3] },
  sectionTitle: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
  },
  label: { color: theme.colors.foregroundMuted, fontSize: theme.fontSize.sm },
  input: {
    minHeight: 40,
    paddingHorizontal: theme.spacing[3],
    borderWidth: 1,
    borderColor: theme.colors.borderAccent,
    borderRadius: theme.borderRadius.md,
  },
  promptInput: {
    minHeight: 88,
    padding: theme.spacing[3],
    borderWidth: 1,
    borderColor: theme.colors.borderAccent,
    borderRadius: theme.borderRadius.md,
    textAlignVertical: "top",
  },
  empty: { color: theme.colors.foregroundMuted },
  error: { color: theme.colors.destructive },
  success: { color: theme.colors.palette.green[500] },
  taskCard: {
    gap: theme.spacing[3],
    padding: theme.spacing[4],
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface2,
  },
  taskHeader: { flexDirection: "row", alignItems: "center", gap: theme.spacing[3] },
  taskTitleGroup: { flex: 1, gap: theme.spacing[1] },
  taskTitle: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
  },
  taskMeta: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
    textTransform: "capitalize",
  },
  prompt: { color: theme.colors.foregroundMuted, fontSize: theme.fontSize.sm },
  command: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fontFamily.mono,
    padding: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface3,
  },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: theme.spacing[2] },
  muted: { color: theme.colors.foregroundMuted },
}));
