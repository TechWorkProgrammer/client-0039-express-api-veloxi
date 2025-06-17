import { Prisma, PrismaClient } from "@prisma/client";
import CustomError from "@/middleware/CustomError";

abstract class Service {
  static prisma = new PrismaClient();

  protected static handleError(error: any): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2002":
          const field = (error.meta?.target) && Array.isArray(error.meta?.target) ? (error.meta.target as string[]).join(", ") : "field";
          throw new CustomError(`Unique constraint failed on the ${field}`, 409);
        case "P2003":
          throw new CustomError("Foreign key constraint failed. Please ensure related data exists.", 409);
        case "P2004":
          throw new CustomError("A database transaction failed. Please try again.", 409);
        case "P2014":
          throw new CustomError("The change you are trying to make would violate the required relation between the models.", 400);
        case "P2016":
          throw new CustomError("No results found for the specified query.", 404);
        case "P2017":
          throw new CustomError("Foreign key violation. The referenced record does not exist.", 409);
        case "P2021":
          throw new CustomError("The table you are querying does not exist in the current database.", 400);
        case "P2022":
          throw new CustomError("The column you are querying does not exist in the current database.", 400);
        case "P2025":
          throw new CustomError("Data not found, please check if the data is available and try again.", 404);
        case "P2033":
          throw new CustomError("A required value is missing.", 400);
        case "P2035":
          throw new CustomError("Constraint violation occurred.", 409);
        default:
          throw new CustomError(`An unexpected database error occurred: ${error.code}`, 500);
      }
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      throw new CustomError("The provided data is invalid. Please check your input.", 400);
    } else if (error instanceof Prisma.PrismaClientRustPanicError) {
      throw new CustomError("A critical database error occurred. Please contact support.", 500);
    } else if (error.code === "ECONNREFUSED") {
      throw new CustomError("Database connection was refused. Please check your database service.", 503);
    } else if (error.code === "ETIMEDOUT") {
      throw new CustomError("Database request timed out. Please try again later.", 504);
    } else if (error.code === "ENOTFOUND") {
      throw new CustomError("Database not found. Please check your connection.", 503);
    } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
      throw new CustomError("Database access was denied. Please check your credentials.", 403);
    } else if (error.code === "ER_CON_COUNT_ERROR") {
      throw new CustomError("Too many database connections. Please try again later.", 429);
    } else if (error.code === "ER_LOCK_WAIT_TIMEOUT") {
      throw new CustomError("A database lock wait timed out. Please try again later.", 504);
    } else if (error.code === "ER_NO_DB_ERROR") {
      throw new CustomError("No database selected. Please ensure the correct database is being used.", 400);
    } else {
      throw new CustomError(error.message || "An unexpected error occurred.", 500);
    }
  }
}

export default Service;
