import { useEffect } from 'react';

let socket: WebSocket | null = null;

export const useWebSocket = () => {
  useEffect(() => {
    // Подключение к WebSocket серверу
    const connectWebSocket = () => {
      try {
        socket = new WebSocket('ws://localhost:3001');
        
        socket.onopen = () => {
          console.log('WebSocket подключен');
        };
        
        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Получены данные:', data);
            // Здесь будет обработка входящих сообщений
          } catch (error) {
            console.error('Ошибка парсинга сообщения:', error);
          }
        };
        
        socket.onerror = (error) => {
          console.error('Ошибка WebSocket:', error);
        };
        
        socket.onclose = () => {
          console.log('WebSocket отключен');
          // Переподключение через 5 секунд
          setTimeout(connectWebSocket, 5000);
        };
      } catch (error) {
        console.error('Ошибка подключения WebSocket:', error);
        setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    // Очистка при размонтировании
    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);
};

export const sendMessage = (type: string, data: any) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type, data }));
  } else {
    console.warn('WebSocket не подключен');
  }
}; 