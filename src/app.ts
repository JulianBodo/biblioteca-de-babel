import express from "express";

export class App {
  public readonly app;

  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  public start() {
    this.app.listen(3000, () => {
      console.log("Server is running on port 3000");
    });
    console.log("App started");
  }
}
