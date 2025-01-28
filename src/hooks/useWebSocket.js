import { useState, useEffect, useRef, useCallback } from 'react';

const useWebSocket = (url, options = {}) => {
    const [socket, setSocket] = useState(null);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const maxRetries = options.maxRetries || 5;
    const retryTimeout = useRef(null);

    const connect = useCallback(() => {
        const ws = new WebSocket(url);

        ws.onopen = () => {
            console.log("Connected");
            setSocket(ws);
            setRetryCount(0);
            setError(null);
        };

        ws.onerror = (err) => {
            console.error("WebSocket error:", err);
            setError(err);
        };

        // This implements Exponential Backoff retry strategy
        ws.onclose = () => {
            if (retryCount < maxRetries) {
                const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);
                console.log(`WebSocket disconnected. Retrying in ${retryDelay / 1000} seconds...`);
                retryTimeout.current = setTimeout(() => {
                    setRetryCount(prevCount => prevCount + 1);
                    connect();
                }, retryDelay);
            } else {
                setError(new Error("Max retries reached, could not connect to WebSocket."));
            }
        };

        setSocket(ws);
    }, [url, retryCount, maxRetries]);

    useEffect(() => {
        connect();

        return () => {
            if (socket) {
                socket.close();
            }
            if (retryTimeout.current) {
                clearTimeout(retryTimeout.current);
            }
        };
    }, [connect]);

    return { socket, error };
};

export default useWebSocket;