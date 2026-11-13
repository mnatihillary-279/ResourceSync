import { z } from "zod";
import {
  applyOperation,
  listConflicts,
  listResources
} from "../services/syncService.js";

const operationSchema = z.object({
  operationId: z.string().uuid(),
  recordId: z.string().uuid(),
  type: z.enum(["CREATE", "UPDATE", "DELETE"]),
  payload: z.object({
    name: z.string().trim().min(1).max(100),
    category: z.string().trim().min(1).max(100),
    quantity: z.number().int().nonnegative(),
    minimumStock: z.number().int().nonnegative(),
    location: z.string().trim().min(1).max(100)
  }).strict().nullable(),
  baseVersion: z.number().int().nonnegative(),
  clientTimestamp: z.string().datetime(),
  deviceId: z.string().uuid()
}).superRefine((operation, context) => {
  if (operation.type !== "DELETE" && operation.payload === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "CREATE and UPDATE operations require a resource payload.",
      path: ["payload"]
    });
  }
  if (operation.type === "DELETE" && operation.payload !== null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "DELETE operations must not include a payload.",
      path: ["payload"]
    });
  }
});

export async function postSync(req, res, next) {
  try {
    const parsed = operationSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid synchronization operation.",
        details: parsed.error.issues
      });
    }

    const result = await applyOperation(parsed.data);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getResources(req, res, next) {
  try {
    res.json(await listResources());
  } catch (error) {
    next(error);
  }
}

export async function getConflicts(req, res, next) {
  try {
    res.json(await listConflicts());
  } catch (error) {
    next(error);
  }
}
