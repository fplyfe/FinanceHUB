import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { HttpError, readJson, route } from "@/lib/api";
import { passwordSchema } from "@/lib/validators";

export const POST = route(async (req, { userId }) => {
  const { current, next } = passwordSchema.parse(await readJson(req));
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await bcrypt.compare(current, user.passwordHash))) throw new HttpError(400, "Senha atual incorreta");
  await db.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(next, 12) } });
  return { ok: true };
});
