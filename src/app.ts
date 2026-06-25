import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import apiRoutes from "./routes/index.js";
import { setupSwagger } from "./swagger/index.js";

/** Monta Express: JSON, CORS, Swagger, rutas /api y manejo centralizado de errores. */
export class App {
  public readonly app;

  constructor() {
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    setupSwagger(this.app);
    this.app.use("/api", apiRoutes);
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  public start() {
    const server = this.app.listen(config.port, () => {
      console.log(`Servidor corriendo en http://localhost:${config.port}`);
      console.log(`Documentación Swagger: http://localhost:${config.port}/api/docs`);
    });

    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        console.error(
          `Puerto ${config.port} ya está en uso. Detené el proceso anterior (p. ej. otro npm run dev) e intentá de nuevo.`,
        );
        process.exit(1);
      }

      console.error("Error al iniciar el servidor:", error);
      process.exit(1);
    });
  }
}
