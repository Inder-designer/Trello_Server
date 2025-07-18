import { Response } from 'express';

class ResponseHandler {
  success: boolean;
  message: string;
  data: any;
  statusCode: number;

  // Constructor with default values
  constructor(message: string, data: any = null, statusCode: number = 200) {
    this.success = true;
    this.message = message;
    this.data = data;
    this.statusCode = statusCode;
  }

  // Static method to send the response
  static send(res: Response, message: string = "Success", data: any = null, statusCode: number = 200) {
    const response = new ResponseHandler(message, data, statusCode);
    return res.status(statusCode).json(response);
  }
}

export default ResponseHandler;
