import { route } from "@/lib/api";
import { generateRecurring } from "@/lib/finance";

export const POST = route(async () => ({ created: await generateRecurring() }));
