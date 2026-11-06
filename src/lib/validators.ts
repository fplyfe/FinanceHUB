import { z } from "zod";

const money = z.coerce.number().positive("Valor deve ser maior que zero").max(999_999_999);
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (AAAA-MM-DD)");
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida").default("#6366f1");
const optId = z.preprocess((v) => (v === "" || v === undefined ? null : v), z.string().nullable());
const optText = z.preprocess((v) => (v === "" || v === undefined ? null : v), z.string().max(500).nullable());
const day = z.coerce.number().int().min(1).max(31);

export const accountSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(60),
  type: z.enum(["CHECKING", "SAVINGS", "CASH", "INVESTMENT", "WALLET"]).default("CHECKING"),
  initialBalance: z.coerce.number().min(-999_999_999).max(999_999_999).default(0),
  color,
});

export const cardSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(60),
  brand: optText,
  limit: money,
  closingDay: day,
  dueDay: day,
  color: color.default("#8b5cf6"),
  payAccountId: optId,
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(40),
  type: z.enum(["INCOME", "EXPENSE"]),
  color: color.default("#64748b"),
});

export const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().trim().min(1, "Informe a descrição").max(120),
  amount: money,
  date: dateStr,
  status: z.enum(["PENDING", "PAID"]).default("PAID"),
  notes: optText,
  accountId: optId,
  cardId: optId,
  categoryId: optId,
});

export const installmentSchema = z.object({
  description: z.string().trim().min(1, "Informe a descrição").max(120),
  totalAmount: money,
  installments: z.coerce.number().int().min(2, "Mínimo 2 parcelas").max(120),
  firstDate: dateStr,
  accountId: optId,
  cardId: optId,
  categoryId: optId,
});

export const transferSchema = z
  .object({
    fromAccountId: z.string().min(1, "Informe a conta de origem"),
    toAccountId: z.string().min(1, "Informe a conta de destino"),
    amount: money,
    date: dateStr,
    description: z.preprocess((v) => (v === "" || v == null ? "Transferência" : v), z.string().max(120)),
  })
  .refine((v) => v.fromAccountId !== v.toAccountId, { message: "Origem e destino devem ser diferentes", path: ["toAccountId"] });

export const recurringSchema = z.object({
  description: z.string().trim().min(1, "Informe a descrição").max(120),
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: money,
  frequency: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]).default("MONTHLY"),
  startDate: dateStr,
  endDate: z.preprocess((v) => (v === "" || v == null ? null : v), dateStr.nullable()),
  autoPay: z.coerce.boolean().default(false),
  active: z.coerce.boolean().default(true),
  accountId: optId,
  cardId: optId,
  categoryId: optId,
});

export const goalSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(80),
  targetAmount: money,
  deadline: z.preprocess((v) => (v === "" || v == null ? null : v), dateStr.nullable()),
  color: color.default("#10b981"),
  notes: optText,
});

export const contributionSchema = z.object({
  amount: z.coerce.number().refine((v) => v !== 0, "Valor não pode ser zero").pipe(z.number().min(-999_999_999).max(999_999_999)),
  date: dateStr,
  note: optText,
});

export const passwordSchema = z.object({
  current: z.string().min(1),
  next: z.string().min(8, "A nova senha deve ter ao menos 8 caracteres").max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export const INVESTMENT_TYPES = ["FIXED_INCOME", "STOCKS", "REITS", "FUNDS", "CRYPTO", "PENSION", "INTERNATIONAL", "OTHER"] as const;

export const investmentSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(80),
  type: z.enum(INVESTMENT_TYPES).default("FIXED_INCOME"),
  institution: optText,
  color: color.default("#0ea5e9"),
  notes: optText,
});

export const investmentEntrySchema = z.object({
  type: z.enum(["CONTRIBUTION", "WITHDRAWAL", "VALUATION"]),
  amount: z.coerce.number().min(0, "Valor inválido").max(999_999_999),
  date: dateStr,
  accountId: optId,
  note: optText,
});

const email = z.string().trim().toLowerCase().email("E-mail inválido").max(120);
const newPassword = z.string().min(8, "A senha deve ter ao menos 8 caracteres").max(100);

export const userCreateSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(60),
  email,
  password: newPassword,
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(60),
  email,
  role: z.enum(["ADMIN", "MEMBER"]),
  active: z.boolean(),
});

export const resetPasswordSchema = z.object({ password: newPassword });

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(60),
  email,
});
