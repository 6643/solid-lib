type HttpOptions = RequestInit & {
    baseUrl?: string;
};

const processResponse = async (response: Response) => {
    if (!response.ok) {
        const errorText = await response.text();
        // Throw a custom error object for better handling
        const error = new Error(errorText || `HTTP error! status: ${response.status}`);
        (error as any).status = response.status;
        throw error;
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return response.json();
    }
    return response.text();
};

const createHttp = (defaultOptions: HttpOptions = {}) => {
    const request = async (method: string, url: string, options: HttpOptions = {}) => {
        const mergedOptions = { ...defaultOptions, ...options };
        const { baseUrl, ...fetchOptions } = mergedOptions;
        
        const fullUrl = baseUrl ? `${baseUrl}${url}` : url;

        const headers = new Headers({ ...defaultOptions.headers, ...options.headers });

        if (options.body && typeof options.body !== 'string' && !(options.body instanceof FormData)) {
            headers.set('Content-Type', 'application/json');
            fetchOptions.body = JSON.stringify(options.body);
        }

        const response = await fetch(fullUrl, {
            ...fetchOptions,
            method,
            headers,
        });

        return processResponse(response);
    };

    return {
        get: <T = any>(url: string, options?: HttpOptions): Promise<T> => request('GET', url, options),
        post: <T = any>(url: string, body?: any, options?: HttpOptions): Promise<T> => request('POST', url, { ...options, body }),
        put: <T = any>(url: string, body?: any, options?: HttpOptions): Promise<T> => request('PUT', url, { ...options, body }),
        del: <T = any>(url: string, options?: HttpOptions): Promise<T> => request('DELETE', url, options),
    };
};

// Export a default instance for immediate use
const http = createHttp();

export { createHttp, http };
