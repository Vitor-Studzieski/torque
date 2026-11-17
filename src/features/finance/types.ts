export type FinanceType = "receivable" | "payable";
export type FinanceStatus = "paid" | "pending" | "overdue";

export interface FinanceEntry {
  id: string;
  description: string;
  type: FinanceType;
  category: string;
  amount: number;
  dueDate: string;
  paidAt?: string;
  status: FinanceStatus;
  workOrderId?: string;
  paymentMethod?: string;
}
