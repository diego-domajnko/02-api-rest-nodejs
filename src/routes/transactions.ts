import { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { knex } from "../database";
import { checkSessionId } from "../middlewares/checkSessionId";

export async function transactionsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/",
    {
      preHandler: [checkSessionId],
    },
    async (req) => {
      const { sessionId } = req.cookies;
      const transactions = await knex("transactions").where("session_id", sessionId).select();
      return { transactions };
    }
  );

  app.get(
    "/:id",
    {
      preHandler: [checkSessionId],
    },
    async (req) => {
      const { sessionId } = req.cookies;
      const getTransactionsParamsSchema = z.object({
        id: z.string().uuid(),
      });
      const { id } = getTransactionsParamsSchema.parse(req.params);
      const transaction = await knex("transactions")
        .where({
          id,
          session_id: sessionId,
        })
        .first();

      return { transaction };
    }
  );

  app.get(
    "/summary",
    {
      preHandler: [checkSessionId],
    },
    async (req) => {
      const { sessionId } = req.cookies;
      const summary = await knex("transactions")
        .where("session_id", sessionId)
        .sum("amount", {
          as: "amount",
        })
        .first();

      return { summary };
    }
  );

  app.post("/", async (req, res) => {
    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(["credit", "debit"]),
    });

    const { amount, title, type } = createTransactionBodySchema.parse(req.body);

    let { sessionId } = req.cookies;

    if (!sessionId) {
      sessionId = randomUUID();
      res.cookie("sessionId", sessionId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    await knex("transactions").insert({
      id: randomUUID(),
      title,
      amount: amount * (type === "debit" ? -1 : 1),
      session_id: sessionId,
    });

    return res.status(201).send("Transaction created!");
  });
}
