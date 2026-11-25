import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  BILL_DATE_PATTERN,
  BILL_MAX_AMOUNT,
  BILL_NAME_MAX_LENGTH,
  BILL_NAME_MIN_LENGTH,
  normalizeBillCategory,
  type BillInput,
  type BillRecord,
} from '../types/bill';

const BILLS_COLLECTION = 'bills';

function sanitizeBillInput(input: BillInput): BillInput {
  const cleanName = input.name.trim().slice(0, BILL_NAME_MAX_LENGTH);
  const cleanAmount = Math.round(Number(input.amount));

  if (cleanName.length < BILL_NAME_MIN_LENGTH) {
    throw new Error('Tên khoản chi tiêu không được để trống.');
  }
  if (!Number.isFinite(cleanAmount) || cleanAmount <= 0 || cleanAmount > BILL_MAX_AMOUNT) {
    throw new Error('Số tiền phải lớn hơn 0 ₫.');
  }
  if (!BILL_DATE_PATTERN.test(input.date)) {
    throw new Error('Ngày chi tiêu không hợp lệ.');
  }

  return {
    name: cleanName,
    amount: cleanAmount,
    date: input.date,
    category: normalizeBillCategory(input.category),
    isPaid: Boolean(input.isPaid),
  };
}

function generateBillId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `bill_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function subscribeUserBills(
  userId: string,
  onData: (bills: BillRecord[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, BILLS_COLLECTION), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const records: BillRecord[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: String(data.userId ?? ''),
          name: String(data.name ?? ''),
          amount: Number(data.amount ?? 0),
          date: String(data.date ?? ''),
          category: normalizeBillCategory(data.category),
          isPaid: Boolean(data.isPaid ?? false),
          createdAt: data.createdAt ?? null,
          updatedAt: data.updatedAt ?? null,
        };
      });

      records.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const aSec = a.createdAt?.seconds ?? 0;
        const bSec = b.createdAt?.seconds ?? 0;
        return aSec - bSec;
      });

      onData(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, BILLS_COLLECTION);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function createBill(userId: string, input: BillInput): Promise<string> {
  const valid = sanitizeBillInput(input);
  const billId = generateBillId();
  const ref = doc(db, BILLS_COLLECTION, billId);

  try {
    await setDoc(ref, {
      userId,
      name: valid.name,
      amount: valid.amount,
      date: valid.date,
      category: valid.category,
      isPaid: valid.isPaid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return billId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${BILLS_COLLECTION}/${billId}`);
  }
}

export async function updateBill(billId: string, input: BillInput): Promise<void> {
  const valid = sanitizeBillInput(input);
  const ref = doc(db, BILLS_COLLECTION, billId);

  try {
    await updateDoc(ref, {
      name: valid.name,
      amount: valid.amount,
      date: valid.date,
      category: valid.category,
      isPaid: valid.isPaid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${BILLS_COLLECTION}/${billId}`);
  }
}

export async function toggleBillPaid(bill: BillRecord, isPaid: boolean): Promise<void> {
  const ref = doc(db, BILLS_COLLECTION, bill.id);

  try {
    await updateDoc(ref, {
      isPaid: Boolean(isPaid),
      category: normalizeBillCategory(bill.category),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${BILLS_COLLECTION}/${bill.id}`);
  }
}

export async function batchSetBillsPaid(
  bills: BillRecord[],
  isPaid: boolean
): Promise<void> {
  const targets = bills.filter((b) => b.isPaid !== isPaid);
  if (targets.length === 0) return;

  try {
    const chunkSize = 450;
    for (let i = 0; i < targets.length; i += chunkSize) {
      const chunk = targets.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const bill of chunk) {
        const ref = doc(db, BILLS_COLLECTION, bill.id);
        batch.update(ref, {
          isPaid: Boolean(isPaid),
          category: normalizeBillCategory(bill.category),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, BILLS_COLLECTION);
  }
}

export async function deleteBill(billId: string): Promise<void> {
  const ref = doc(db, BILLS_COLLECTION, billId);

  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${BILLS_COLLECTION}/${billId}`);
  }
}
