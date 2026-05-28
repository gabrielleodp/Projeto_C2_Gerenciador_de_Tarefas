import express from "express";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import projetosRouter from "./routes/projetos.js";
import tarefasRouter from "./routes/tarefas.js";

export function createApp() {
  const app = express();

  app.use(express.json());

  // Rotas
  app.use("/auth", authRouter);
  app.use("/users", usersRouter);
  app.use("/projetos", projetosRouter);
  app.use("/tarefas", tarefasRouter);

  // Rota raiz
  app.get("/", (_req, res) => {
    res.json({
      projeto: "Task Manager API",
      versao: "1.0.0",
      rotas: ["/auth", "/users", "/projetos", "/tarefas"],
    });
  });

  // Handler de erros global
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ erro: "Erro interno do servidor", detalhe: err.message });
  });

  return app;
}
