import { api } from './api'

/**
 * Turn one overwhelming task into three small, visible steps.
 * The original task is kept and moved to Upcoming — nothing is deleted.
 */
export async function breakDownTask(task, refresh) {
  if (!task) return
  const parts = [
    task.first_action || `Open what you need for ${task.title}`,
    `Continue: ${task.title}`,
    `Finish and check: ${task.title}`,
  ]
  for (const [index, title] of parts.entries()) {
    // Sequential creation keeps ordering stable without a dedicated batch endpoint.
    // eslint-disable-next-line no-await-in-loop
    await api.tasks.create({
      title,
      status: 'today',
      estimated_minutes: 10,
      source: 'break_down',
      category: task.category,
      first_action: title,
      tags: [task.id],
      position: (task.position || 0) + index + 1,
    })
  }
  await api.tasks.update(task.id, { status: 'upcoming' })
  if (refresh) await refresh()
}
