import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const EXPENSE = [
  ["Moradia", "#6366f1"], ["Mercado", "#22c55e"], ["Transporte", "#f59e0b"], ["Saúde", "#ef4444"],
  ["Educação", "#0ea5e9"], ["Lazer", "#ec4899"], ["Restaurantes", "#f97316"], ["Assinaturas", "#8b5cf6"],
  ["Contas (luz, água, internet)", "#14b8a6"], ["Compras", "#a855f7"], ["Outros", "#64748b"],
];
const INCOME = [["Salário", "#10b981"], ["Freelance", "#06b6d4"], ["Investimentos", "#3b82f6"], ["Outros", "#64748b"]];

async function main() {
  // Usuários: criados apenas se não existirem (nunca sobrescreve senha existente)
  for (const i of [1, 2]) {
    const email = process.env[`USER${i}_EMAIL`]?.toLowerCase();
    const password = process.env[`USER${i}_PASSWORD`];
    const name = process.env[`USER${i}_NAME`] ?? `Usuário ${i}`;
    if (!email || !password) {
      console.warn(`USER${i}_EMAIL/USER${i}_PASSWORD não definidos — pulando.`);
      continue;
    }
    const exists = await db.user.findUnique({ where: { email } });
    if (exists) continue;
    await db.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 12) } });
    console.log(`Usuário criado: ${email}`);
  }

  // Categorias padrão (apenas se a tabela estiver vazia)
  if ((await db.category.count()) === 0) {
    await db.category.createMany({
      data: [
        ...EXPENSE.map(([name, color]) => ({ name, color, type: "EXPENSE" as const })),
        ...INCOME.map(([name, color]) => ({ name, color, type: "INCOME" as const })),
      ],
      skipDuplicates: true,
    });
    console.log("Categorias padrão criadas");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
