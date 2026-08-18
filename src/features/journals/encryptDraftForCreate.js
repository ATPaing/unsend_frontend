import * as friendService from '../friends/friendService.js'
import { encryptOwnerJournal } from '../../utils/crypto/encryptJournal.js'

/**
 * Encrypt a journal/capsule draft and wrap AES keys for selected friends.
 */
export async function encryptDraftForCreate(draft, ownerPublicKeyBase64) {
  const friends = Array.isArray(draft.sharedWith) ? draft.sharedWith : []
  const recipients = []

  for (const friend of friends) {
    const friendCrypto = await friendService.getFriendPublicKey(friend.id)
    recipients.push({
      userId: friend.id,
      publicKeyBase64: friendCrypto.publicKey,
    })
  }

  return encryptOwnerJournal({
    title: draft.title,
    content: draft.content,
    ownerPublicKeyBase64,
    journalType: draft.journalType || 'JOURNAL',
    unlockAt: draft.unlockAt || null,
    recipients,
    imageFile: draft.imageFile ?? null,
  })
}
