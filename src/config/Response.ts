import {Response as EResponse} from 'express';

type ResponseData = {
    status: string;
    message: string;
    data?: any;
};

class Response {
    static sendResponse(res: EResponse, statusCode: number, message: string = '', data: any = null): EResponse {
        let response: ResponseData = {
            status: statusCode < 300 ? 'success' : 'error',
            message
        };
        if (data !== null) response.data = data;
        return statusCode === 204 ? res.status(statusCode).send() : res.status(statusCode).json(response);
    }

    static Success(res: EResponse, message: string = 'Ok', data?: any): EResponse {
        return Response.sendResponse(res, 200, message, data);
    }

    static Created(res: EResponse, message: string = 'Created', data?: any): EResponse {
        return Response.sendResponse(res, 201, message, data);
    }

    static Accepted(res: EResponse, message: string = 'Accepted', data?: any): EResponse {
        return Response.sendResponse(res, 202, message, data);
    }

    static NoContent(res: EResponse): EResponse {
        return Response.sendResponse(res, 204, 'No Content');
    }

    static BadRequest(res: EResponse, message: string = 'Bad Request'): EResponse {
        return Response.sendResponse(res, 400, message);
    }

    static Unauthorized(res: EResponse, message: string = 'Unauthorized'): EResponse {
        return Response.sendResponse(res, 401, message);
    }

    static PaymentRequired(res: EResponse, message: string = 'Payment Required'): EResponse {
        return Response.sendResponse(res, 402, message);
    }

    static Forbidden(res: EResponse, message: string = 'Forbidden'): EResponse {
        return Response.sendResponse(res, 403, message);
    }

    static NotFound(res: EResponse, message: string = 'Not Found'): EResponse {
        return Response.sendResponse(res, 404, message);
    }

    static MethodNotAllowed(res: EResponse, message: string = 'Method Not Allowed'): EResponse {
        return Response.sendResponse(res, 405, message);
    }

    static NotAcceptable(res: EResponse, message: string = 'Not Acceptable'): EResponse {
        return Response.sendResponse(res, 406, message);
    }

    static ProxyAuthenticationRequired(res: EResponse, message: string = 'Proxy Authentication Required'): EResponse {
        return Response.sendResponse(res, 407, message);
    }

    static RequestTimeout(res: EResponse, message: string = 'Request Timeout'): EResponse {
        return Response.sendResponse(res, 408, message);
    }

    static Conflict(res: EResponse, message: string = 'Conflict'): EResponse {
        return Response.sendResponse(res, 409, message);
    }

    static Gone(res: EResponse, message: string = 'Gone'): EResponse {
        return Response.sendResponse(res, 410, message);
    }

    static LengthRequired(res: EResponse, message: string = 'Length Required'): EResponse {
        return Response.sendResponse(res, 411, message);
    }

    static PreconditionFailed(res: EResponse, message: string = 'Precondition Failed'): EResponse {
        return Response.sendResponse(res, 412, message);
    }

    static PayloadTooLarge(res: EResponse, message: string = 'Payload Too Large'): EResponse {
        return Response.sendResponse(res, 413, message);
    }

    static URITooLong(res: EResponse, message: string = 'URI Too Long'): EResponse {
        return Response.sendResponse(res, 414, message);
    }

    static UnsupportedMediaType(res: EResponse, message: string = 'Unsupported Media Type'): EResponse {
        return Response.sendResponse(res, 415, message);
    }

    static RangeNotSatisfiable(res: EResponse, message: string = 'Range Not Satisfiable'): EResponse {
        return Response.sendResponse(res, 416, message);
    }

    static ExpectationFailed(res: EResponse, message: string = 'Expectation Failed'): EResponse {
        return Response.sendResponse(res, 417, message);
    }

    static ImATeapot(res: EResponse, message: string = "'I'm a teapot'"): EResponse {
        return Response.sendResponse(res, 418, message);
    }

    static MisdirectedRequest(res: EResponse, message: string = 'Misdirected Request'): EResponse {
        return Response.sendResponse(res, 421, message);
    }

    static UnprocessableEntity(res: EResponse, message: string = 'Unprocessable Entity'): EResponse {
        return Response.sendResponse(res, 422, message);
    }

    static Locked(res: EResponse, message: string = 'Locked'): EResponse {
        return Response.sendResponse(res, 423, message);
    }

    static FailedDependency(res: EResponse, message: string = 'Failed Dependency'): EResponse {
        return Response.sendResponse(res, 424, message);
    }

    static TooEarly(res: EResponse, message: string = 'Too Early'): EResponse {
        return Response.sendResponse(res, 425, message);
    }

    static UpgradeRequired(res: EResponse, message: string = 'Upgrade Required'): EResponse {
        return Response.sendResponse(res, 426, message);
    }

    static PreconditionRequired(res: EResponse, message: string = 'Precondition Required'): EResponse {
        return Response.sendResponse(res, 428, message);
    }

    static TooManyRequests(res: EResponse, message: string = 'Too Many Requests'): EResponse {
        return Response.sendResponse(res, 429, message);
    }

    static RequestHeaderFieldsTooLarge(res: EResponse, message: string = 'Request Header Fields Too Large'): EResponse {
        return Response.sendResponse(res, 431, message);
    }

    static UnavailableForLegalReasons(res: EResponse, message: string = 'Unavailable For Legal Reasons'): EResponse {
        return Response.sendResponse(res, 451, message);
    }

    static InternalServerError(res: EResponse, message: string = 'Internal Server Error'): EResponse {
        return Response.sendResponse(res, 500, message);
    }

    static NotImplemented(res: EResponse, message: string = 'Not Implemented'): EResponse {
        return Response.sendResponse(res, 501, message);
    }

    static BadGateway(res: EResponse, message: string = 'Bad Gateway'): EResponse {
        return Response.sendResponse(res, 502, message);
    }

    static ServiceUnavailable(res: EResponse, message: string = 'Service Unavailable'): EResponse {
        return Response.sendResponse(res, 503, message);
    }

    static GatewayTimeout(res: EResponse, message: string = 'Gateway Timeout'): EResponse {
        return Response.sendResponse(res, 504, message);
    }

    static HTTPVersionNotSupported(res: EResponse, message: string = 'HTTP Version Not Supported'): EResponse {
        return Response.sendResponse(res, 505, message);
    }

    static VariantAlsoNegotiates(res: EResponse, message: string = 'Variant Also Negotiates'): EResponse {
        return Response.sendResponse(res, 506, message);
    }

    static InsufficientStorage(res: EResponse, message: string = 'Insufficient Storage'): EResponse {
        return Response.sendResponse(res, 507, message);
    }

    static LoopDetected(res: EResponse, message: string = 'Loop Detected'): EResponse {
        return Response.sendResponse(res, 508, message);
    }

    static NotExtended(res: EResponse, message: string = 'Not Extended'): EResponse {
        return Response.sendResponse(res, 510, message);
    }

    static NetworkAuthenticationRequired(res: EResponse, message: string = 'Network Authentication Required'): EResponse {
        return Response.sendResponse(res, 511, message);
    }
}

export default Response;
