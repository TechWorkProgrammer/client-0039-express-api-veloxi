import express, { Application, json, NextFunction, Request, Response as EResponse, Router, urlencoded } from "express";
import responseTime from "response-time";
import { join } from "path";
import process from "process";
import Variables from "@/config/Variables";
import Response from "@/config/Response";
import Exception from "@/config/Exception";
import AuthRoute from "@/routes/AuthRoute";
import UserRoute from "@/routes/UserRoute";
import MusicApiRoute from "@/routes/MusicApiRoute";
import MeshyApiRoute from "@/routes/MeshyApiRoute";
import CodeApiRoute from "@/routes/CodeApiRoute";

class Route {
  public static registerRoutes(app: any): void {
    app.use(json());
    app.use(urlencoded({ extended: true }));
    app.use(responseTime());

    this.wrapAllRoutes(app);

    app.use("/auth", AuthRoute.route());
    app.use("/user", UserRoute.route());
    app.use("/music", MusicApiRoute.route());
    app.use("/mesh", MeshyApiRoute.route());
    app.use("/code", CodeApiRoute.route());

    app.use("/assets", express.static(join(process.cwd(), Variables.ASSETS_PATH)));
    app.use("/*", (req: Request, res: EResponse) => {
      Response.NotFound(res);
    });
  }

  private static wrapAllRoutes(app: Application): void {
    const originalUse = app.use.bind(app);
    app.use = (...args: any[]) => {
      const path = typeof args[0] === "string" ? args[0] : null;
      const handler = path ? args[1] : args[0];
      if (handler && (handler as Router).stack) {
        this.wrapAsyncRouter(handler as Router);
      } else if (typeof handler === "function") {
        const wrappedHandler = this.asyncErrorCatcher(handler);
        if (path) {
          return originalUse(path, wrappedHandler);
        }
        return originalUse(wrappedHandler);
      }
      return originalUse(...args);
    };
  }

  private static wrapAsyncRouter(router: Router): Router {
    router.stack.forEach((layer: any) => {
      const route = layer.route;
      if (route) {
        route.stack.forEach((layer: any) => {
          if (layer.method && typeof layer.handle === "function") {
            layer.handle = this.asyncErrorCatcher(layer.handle);
          }
        });
      }
    });
    return router;
  }

  private static asyncErrorCatcher(fn: Function) {
    return (req: Request, res: EResponse, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch((error) => {
        Exception.handleError(error, req, res);
      });
    };
  }
}

export default Route;
