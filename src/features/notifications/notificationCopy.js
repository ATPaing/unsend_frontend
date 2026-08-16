export function getNotificationMessage(notification) {
  const actorName = notification?.actor?.username || 'Someone'

  switch (notification?.type) {
    case 'FRI_REQ':
      return `${actorName} sent you a friend request`
    case 'FRI_ACCEPTED':
      return `${actorName} accepted your friend request`
    case 'JOURNAL_SHARED':
      return `${actorName} shared a journal with you`
    default:
      return 'You have a new notification'
  }
}

export function getNotificationHref(notification) {
  switch (notification?.type) {
    case 'FRI_REQ':
    case 'FRI_ACCEPTED':
      return '/friends'
    case 'JOURNAL_SHARED':
      return notification.journalId
        ? `/journals/${notification.journalId}`
        : '/shared'
    default:
      return null
  }
}
