import { TaskItem } from '@/entities/task'
import { injection } from '@/util/inject'
import { TaskState } from '@xmcl/runtime-api'
import { computed } from 'vue'
import { kTaskManager } from './taskManager'

export function useTaskCount() {
  const proxy = injection(kTaskManager)
  const { tasks } = proxy
  const count = computed(() => tasks.value.filter(t => t.state === TaskState.Running).length)
  return { count }
}

export function useTasks() {
  const proxy = injection(kTaskManager)
  const { pause, resume, cancel, tasks, throughput } = proxy
  return { tasks, pause, resume, cancel, throughput }
}

export function useTask(finder: (i: TaskItem) => boolean) {
  const proxy = injection(kTaskManager)

  const { tasks, pause, resume, cancel } = proxy

  const task = computed(() => tasks.value.find(finder))
  const name = computed(() => task.value?.title ?? '')
  const time = computed(() => task.value?.time ?? '')
  const status = computed(() => task.value?.state ?? TaskState.Idle)
  const progress = computed(() => task.value?.progress ?? -1)
  const total = computed(() => task.value?.total ?? -1)
  const message = computed(() => task.value?.message ?? '')

  const pause_ = () => task.value ? pause(task.value) : undefined
  const resume_ = () => task.value ? resume(task.value) : undefined

  return {
    name,
    time,
    pause: pause_,
    resume: resume_,
    progress,
    total,
    message,
    status,
  }
}
