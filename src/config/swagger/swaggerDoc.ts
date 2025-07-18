const swaggerDoc = {
    "openapi": "3.0.0",
    "info": {
        "title": "Pets World API",
        "version": "1.0.0",
        "description": "API documentation for the Pets World website"
    },
    "servers": [
        {
            "url": "http://localhost:5000"
        }
    ],
    "paths": {
        "/api/auth/login": {
            "post": {
                "summary": "Login",
                "tags": ["Auth"],
                "requestBody": {
                    "required": true,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "email": {
                                        "type": "string"
                                    },
                                    "password": {
                                        "type": "string"
                                    },
                                },
                                "required": [
                                    "email",
                                    "password"
                                ]
                            }
                        }
                    }
                },
                "responses": {}
        },
        "/api/auth/signup": {
            "post": {
                "summary": "Singup",
                "tags": ["Auth"],
                "requestBody": {
                    "required": true,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "name": {
                                        "type": "string"
                                    },
                                    "number": {
                                        "type": "string"
                                    },
                                    "email": {
                                        "type": "string"
                                    },
                                    "password": {
                                        "type": "string"
                                    },
                                },
                            }
                        }
                    }
                },
                "responses": {}
            }
        }
    }
}

export default swaggerDoc;