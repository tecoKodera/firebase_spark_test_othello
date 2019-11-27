import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'

admin.initializeApp(functions.config().firebase)

const failToNull = (e: any) => {
  console.error(e)
  return null
}

const getRandomDoc = async (
  collectionRef: admin.firestore.CollectionReference
) => {
  const masterDoc = await collectionRef
    .doc('master')
    .get()
    .catch(failToNull)
  if (!masterDoc) {
    return null
  }
  const masterData = masterDoc.data()
  if (!masterData) {
    return null
  }

  const rndKey = Math.floor(masterData.count * Math.random())

  return collectionRef
    .doc(rndKey.toString())
    .get()
    .catch(failToNull)
}

const setCount = async (snap: functions.firestore.DocumentSnapshot) => {
  const ref = snap.ref.parent
  let count = 0
  while (true) {
    const doc = await ref
      .doc(count.toString())
      .get()
      .catch(failToNull)
    if (!doc) {
      break
    }
    const data = doc.data()
    if (!data) {
      break
    }
    count++
  }
  return ref
    .doc('master')
    .set({ count }, { merge: true })
    .catch(failToNull)
}

export const setCountToNameOnCreate = functions.firestore
  .document('name/{nameId}')
  .onCreate(setCount)

export const setCountToNameOnDelete = functions.firestore
  .document('name/{nameId}')
  .onDelete(setCount)

export const setCountToMessageOnCreate = functions.firestore
  .document('message/{messageId}')
  .onCreate(setCount)

export const setCountToMessageOnDelete = functions.firestore
  .document('message/{messageId}')
  .onDelete(setCount)

export const addKey = functions.firestore
  .document('chat/{chatId}')
  .onWrite(
    async (change: functions.Change<functions.firestore.DocumentSnapshot>) => {
      if (!change.after) {
        return
      }
      const data = change.after.data()
      if (!data) {
        return
      }
      if (data.key) {
        return
      }
      const batch = admin.firestore().batch()
      batch.set(change.after.ref, { key: Date.now() }, { merge: true })
      const querySnapshot = await admin
        .firestore()
        .collection('chat')
        .orderBy('key', 'desc')
        .get()
        .catch(failToNull)
      if (querySnapshot) {
        return querySnapshot.docs
          .filter((doc, idx) => idx > 5)
          .reduce((bat, doc) => {
            return bat.delete(doc.ref)
          }, batch)
          .commit()
      }
      return batch.commit().catch(console.error)
    }
  )

export const addNoise = functions.firestore
  .document('noise/trigger')
  .onWrite(
    async (change: functions.Change<functions.firestore.DocumentSnapshot>) => {
      const after = change.after
      if (!after) {
        return
      }
      const data = after.data()
      if (!data) {
        return
      }
      if (!data.created) {
        return
      }

      const noiseWrite = async () => {
        const nameDoc = await getRandomDoc(
          admin.firestore().collection('name')
        ).catch(failToNull)
        if (!nameDoc) {
          return
        }
        const nameData = nameDoc.data()
        if (!nameData) {
          return
        }
        if (!nameData.name) {
          return
        }

        const messageDoc = await getRandomDoc(
          admin.firestore().collection('message')
        ).catch(failToNull)
        if (!messageDoc) {
          return
        }
        const messageData = messageDoc.data()
        if (!messageData) {
          return
        }
        if (!messageData.message) {
          return
        }

        return admin
          .firestore()
          .collection('chat')
          .add({
            message: messageData.message,
            name: nameData.name
          })
          .then(() => {
            admin
              .firestore()
              .collection('noise')
              .doc('control')
              .set({ next_noise: Date.now() + 20 * 1000 }, { merge: true })
              .catch(failToNull)
          })
          .catch(failToNull)
      }

      const noiseControllDoc = await admin
        .firestore()
        .collection('noise')
        .doc('controll')
        .get()
        .catch(failToNull)
      if (!noiseControllDoc) {
        return noiseWrite()
      }
      const noiseControllData = noiseControllDoc.data()
      if (!noiseControllData) {
        return noiseWrite()
      }
      if (noiseControllData.next_noise < Date.now()) {
        return noiseWrite()
      }
      return
    }
  )

const idxToPos = (idx: number) => `${Math.floor(idx / 8)}_${idx % 8}`
const posToIdx = (pos: string) =>
  parseInt(pos.split('_')[0], 10) * 8 + parseInt(pos.split('_')[1], 10)

export const nextPut = functions.firestore
  .document('game/next_put')
  .onWrite(
    async (change: functions.Change<functions.firestore.DocumentSnapshot>) => {
      const after = change.after
      if (!after) {
        return
      }
      const data = after.data()
      if (!data) {
        return
      }
      if (!data.pos) {
        return
      }
      const infoRef = admin
        .firestore()
        .collection('game')
        .doc('info')
      const cellRefs: admin.firestore.DocumentReference[] = []
      for (let i = 0; i < 8 * 8; i++) {
        cellRefs.push(
          admin
            .firestore()
            .collection('game')
            .doc(idxToPos(i))
        )
      }
      const xPut = parseInt(data.pos.split('_')[0], 10)
      const yPut = parseInt(data.pos.split('_')[1], 10)

      return admin
        .firestore()
        .runTransaction(async transaction => {
          const nextPutDoc = await transaction.get(after.ref).catch(failToNull)
          if (!nextPutDoc) {
            return
          }
          const nextPutData = nextPutDoc.data()
          if (!nextPutData) {
            return
          }
          if (!nextPutData.pos) {
            return
          }
          let turn = 1
          const gameInfoDoc = await transaction.get(infoRef).catch(failToNull)
          if (gameInfoDoc) {
            const gameInfoData = gameInfoDoc.data()
            if (gameInfoData && gameInfoData.turn) {
              turn = gameInfoData.turn
            }
          }
          const nextTurn = turn === 1 ? 2 : 1
          const cellDatas = await Promise.all(
            cellRefs.map(async cellRef => {
              const cellDoc = await transaction.get(cellRef)
              if (!cellDoc) {
                return null
              }
              return cellDoc.data()
            })
          )
          let filpPositions: string[] = []
          for (let xDirection = -1; xDirection <= 1; xDirection++) {
            for (let yDirection = -1; yDirection <= 1; yDirection++) {
              if (xDirection === 0 && yDirection === 0) {
                continue
              }
              const tmpFilps: string[] = []
              for (let i = 1; i <= 8; i++) {
                const x = xPut + xDirection * i
                const y = yPut + yDirection * i
                if (x < 0 || y < 0 || x >= 8 || y >= 8) {
                  tmpFilps.splice(0, tmpFilps.length)
                  break
                }
                const iPos = `${x}_${y}`
                const iIdx = posToIdx(iPos)
                const cellData = cellDatas[iIdx]
                if (
                  !cellData ||
                  [1, 2].every(checkValue => checkValue !== cellData.value)
                ) {
                  tmpFilps.splice(0, tmpFilps.length)
                  break
                }
                if (cellData.value === turn) {
                  break
                }
                if (cellData.value === nextTurn) {
                  tmpFilps.push(iPos)
                }
              }
              filpPositions = filpPositions.concat(tmpFilps)
            }
          }
          if (filpPositions.length <= 0) {
            return
          }

          // ここからwrite
          transaction.set(
            admin
              .firestore()
              .collection('game')
              .doc(nextPutData.pos),
            { value: turn }
          )
          filpPositions.forEach(flipPos => {
            transaction.set(
              admin
                .firestore()
                .collection('game')
                .doc(flipPos),
              { value: turn }
            )
          })
          transaction.set(infoRef, { turn: nextTurn }, { merge: true })
        })
        .catch(failToNull)
    }
  )

const isPuttable = (cellDatas: any[], turn: number) => {
  const nextTurn = turn === 1 ? 2 : 1
  for (let checkX = 0; checkX < 8; checkX++) {
    for (let checkY = 0; checkY < 8; checkY++) {
      const checkPos = `${checkX}_${checkY}`
      const checkIdx = posToIdx(checkPos)
      const checkCellData = cellDatas[checkIdx]
      if (
        checkCellData &&
        [1, 2].some(checkValue => checkValue === checkCellData.value)
      ) {
        continue
      }
      for (let xDirection = -1; xDirection <= 1; xDirection++) {
        for (let yDirection = -1; yDirection <= 1; yDirection++) {
          if (xDirection === 0 && yDirection === 0) {
            continue
          }
          for (let i = 1; i < 8; i++) {
            const x = checkX + xDirection * i
            const y = checkY + yDirection * i
            if (x < 0 || y < 0 || x >= 8 || y >= 8) {
              break
            }
            const iPos = `${x}_${y}`
            const iIdx = posToIdx(iPos)
            const cellData = cellDatas[iIdx]
            if (
              !cellData ||
              [1, 2].every(checkValue => checkValue !== cellData.value)
            ) {
              break
            }
            if (cellData.value === turn && i > 1) {
              return true
            }
            if (cellData.value === nextTurn) {
              continue
            }
          }
        }
      }
    }
  }
  return false
}

export const passCheck = functions.firestore
  .document('game/info')
  .onWrite(
    async (change: functions.Change<functions.firestore.DocumentSnapshot>) => {
      const after = change.after
      if (!after) {
        return
      }
      const data = after.data()
      if (!data || !data.turn) {
        return admin.firestore().runTransaction(transaction => {
          return transaction.get(after.ref).then(doc => {
            if (!doc) {
              return
            }
            const transactionData = doc.data()
            if (!transactionData || !transactionData.turn) {
              transaction.set(after.ref, { turn: 1 }, { merge: true })
            }
          })
        })
      }
      const cellRefs: admin.firestore.DocumentReference[] = []
      for (let i = 0; i < 8 * 8; i++) {
        cellRefs.push(
          admin
            .firestore()
            .collection('game')
            .doc(idxToPos(i))
        )
      }

      return admin
        .firestore()
        .runTransaction(async transaction => {
          const infoDoc = await transaction.get(after.ref).catch(failToNull)
          if (!infoDoc) {
            return transaction.set(after.ref, { turn: 1 }, { merge: true })
          }
          const infoData = infoDoc.data()
          if (!infoData) {
            return transaction.set(after.ref, { turn: 1 }, { merge: true })
          }
          if (!infoData.turn) {
            return transaction.set(after.ref, { turn: 1 }, { merge: true })
          }
          const turn = infoData.turn
          const nextTurn = turn === 1 ? 2 : 1
          const cellDatas = await Promise.all(
            cellRefs.map(async cellRef => {
              const cellDoc = await transaction.get(cellRef)
              if (!cellDoc) {
                return null
              }
              return cellDoc.data()
            })
          )
          if (isPuttable(cellDatas, turn)) {
            return
          }
          const counts = [1, 2].map(
            value =>
              cellDatas.filter(cellData => cellData && cellData.value === value)
                .length
          )

          // ここからwrite
          if (isPuttable(cellDatas, nextTurn)) {
            transaction.set(after.ref, { turn: nextTurn }, { merge: true })
          } else {
            cellRefs.forEach((cellRef, idx) => {
              const pos = idxToPos(idx)
              if (pos === '3_3' || pos === '4_4') {
                transaction.set(cellRef, { value: 1 })
              } else if (pos === '3_4' || pos === '4_3') {
                transaction.set(cellRef, { value: 2 })
              } else {
                transaction.delete(cellRef)
              }
            })
            transaction.set(after.ref, { turn: 1 }, { merge: true })
            transaction.set(
              admin
                .firestore()
                .collection('chat')
                .doc('result'),
              {
                message: `白:${counts[0]} 黒:${counts[1]} ${
                  counts[0] > counts[1]
                    ? '白の勝ち'
                    : counts[0] < counts[1]
                    ? '黒の勝ち'
                    : '引き分け'
                }`,
                name: 'ゲームマスター'
              }
            )
          }
          return
        })
        .catch(failToNull)
    }
  )
