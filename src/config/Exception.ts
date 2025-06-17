import {Request, Response as EResponse} from 'express';
import CustomError from "@/middleware/CustomError";
import Response from "@/config/Response";

const statusCodeMap: { [key: number]: (res: EResponse, message: string) => EResponse } = {
    200: Response.Success,
    201: Response.Created,
    202: Response.Accepted,
    204: Response.NoContent,
    400: Response.BadRequest,
    401: Response.Unauthorized,
    402: Response.PaymentRequired,
    403: Response.Forbidden,
    404: Response.NotFound,
    405: Response.MethodNotAllowed,
    406: Response.NotAcceptable,
    407: Response.ProxyAuthenticationRequired,
    408: Response.RequestTimeout,
    409: Response.Conflict,
    410: Response.Gone,
    411: Response.LengthRequired,
    412: Response.PreconditionFailed,
    413: Response.PayloadTooLarge,
    414: Response.URITooLong,
    415: Response.UnsupportedMediaType,
    416: Response.RangeNotSatisfiable,
    417: Response.ExpectationFailed,
    418: Response.ImATeapot,
    421: Response.MisdirectedRequest,
    422: Response.UnprocessableEntity,
    423: Response.Locked,
    424: Response.FailedDependency,
    425: Response.TooEarly,
    426: Response.UpgradeRequired,
    428: Response.PreconditionRequired,
    429: Response.TooManyRequests,
    431: Response.RequestHeaderFieldsTooLarge,
    451: Response.UnavailableForLegalReasons,
    500: Response.InternalServerError,
    501: Response.NotImplemented,
    502: Response.BadGateway,
    503: Response.ServiceUnavailable,
    504: Response.GatewayTimeout,
    505: Response.HTTPVersionNotSupported,
    506: Response.VariantAlsoNegotiates,
    507: Response.InsufficientStorage,
    508: Response.LoopDetected,
    510: Response.NotExtended,
    511: Response.NetworkAuthenticationRequired
};

class Exception {
    static handleError(err: any, req: Request, res: EResponse): EResponse | void {
        if (err instanceof CustomError) {
            const handler = statusCodeMap[err.statusCode] || Response.InternalServerError;
            return handler(res, err.message);
        }

        return Response.InternalServerError(res, err.message || 'Something went wrong.');
    }
}

export default Exception;
