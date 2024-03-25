import req from "supertest";
import { execSync } from "node:child_process";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { afterEach } from "node:test";

describe("Transactions routes", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    execSync("npm run knex -- migrate:rollback --all");
    execSync("npm run knex -- migrate:latest");
  });

  it("Should be able to create a new transaction", async () => {
    const res = await req(app.server).post("/transactions").send({
      title: "New Transaction",
      amount: 5000,
      type: "credit",
    });

    expect(res.statusCode).toEqual(201);
  });

  it("Should be able to list all transactions", async () => {
    const newTransaction = {
      title: "New Transaction",
      amount: 5000,
    };
    const transactionResponse = await req(app.server)
      .post("/transactions")
      .send({ ...newTransaction, type: "credit" });
    const cookies = transactionResponse.get("Set-Cookie") || [];
    const listResponse = await req(app.server).get("/transactions").set("Cookie", cookies);

    expect(listResponse.body.transactions).toEqual([expect.objectContaining(newTransaction)]);
  });

  it("Should be able to list a specific transaction", async () => {
    const newTransaction = {
      title: "New Transaction",
      amount: 5000,
    };
    const transactionResponse = await req(app.server)
      .post("/transactions")
      .send({ ...newTransaction, type: "credit" });
    const cookies = transactionResponse.get("Set-Cookie") || [];
    const listResponse = await req(app.server).get("/transactions").set("Cookie", cookies);
    const transactionId = listResponse.body.transactions[0].id;
    const getResponse = await req(app.server).get(`/transactions/${transactionId}`).set("Cookie", cookies);

    expect(getResponse.body.transaction).toEqual(expect.objectContaining({ ...newTransaction, id: transactionId }));
  });

  it("Should be able to get the summary", async () => {
    const transactionOne = await req(app.server).post("/transactions").send({
      title: "Credit Transaction",
      amount: 5000,
      type: "credit",
    });
    const cookies = transactionOne.get("Set-Cookie") || [];
    await req(app.server).post("/transactions").set("Cookie", cookies).send({
      title: "Debit Transaction",
      amount: 2000,
      type: "debit",
    });
    const getSummary = await req(app.server).get("/transactions/summary").set("Cookie", cookies);

    expect(getSummary.body.summary).toEqual({ amount: 3000 });
  });
});
