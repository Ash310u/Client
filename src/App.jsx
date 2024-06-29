import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useFetchUsersQuery } from "./store";
import Connections from "./components/Connections";

function App() {
  const [socket, setSocket] = useState(null);
  const [newMsg, setNewMsg] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 5;
  const retryTimeout = useRef(null);
  const [wsError, setWsError] = useState(false);

  const { data, isError, isSuccess } = useFetchUsersQuery();

  useEffect(() => {
    const userId = window.localStorage.getItem("biscut");
    const connectWebSocket = () => {
      const socket = new WebSocket(`ws://localhost:8000/chat?userId=${userId}`);

      socket.onopen = () => {
        console.log("Connected");
        setSocket(socket);
        setRetryCount(0); // Reset retry count on successful connection
      };

      socket.onmessage = (msg) => {
        const parsedMessage = JSON.parse(msg?.data);
        if (parsedMessage) {
          setMsgs(pervMsg => [...pervMsg, parsedMessage]);
        }
      };

      socket.onerror = (error) => {
        setWsError(true);
        console.log(error)
      };

      socket.onclose = () => {
        if (retryCount < maxRetries) {
          const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff, max 30 seconds
          console.log(`WebSocket disconnected retry in ${retryDelay / 1000} seconds...`);
          retryTimeout.current = setTimeout(() => {
            setRetryCount(pervCount => pervCount + 1);
            connectWebSocket(); // Retry connection (Recursion)
          }, retryDelay);
        } else {
          console.log("Max retries reached, could not connect to WebSocket.");
        }
      };
    };

    connectWebSocket(); // Initial connection attempt

    return () => {
      if (socket) {
        socket.close();
        console.log("WebSocket connection closed");
      }
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current); // Clear any pending retries on unmount
      }
    };
  }, [retryCount]); // Reconnect on retry count change

  const handleSendMSG = () => {
    const connections = JSON.parse(window.localStorage.getItem("connections"));
    if (newMsg != "") {
      const data = JSON.stringify({
        content: newMsg,
        sender_id: window.localStorage.getItem("biscut"),
        receiver_id: connections[0],
        state: "pending",
      });
      socket.send(data);
      setNewMsg("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const user = {
      username: e.target.username.value,
      name: e.target.name.value,
      email: e.target.email.value,
      password: e.target.password.value,
      status: "online",
      connections: ["66641d65c4143d51b00480ed", "666569a036995de3965f84bb"],
    };

    axios
      .post("http://localhost:8000/user/signup", user)
      .then(function (response) {
        window.localStorage.setItem("biscut", response?.data?._id);
        window.localStorage.setItem(
          "connections",
          JSON.stringify(response?.data?.connections)
        );
      })
      .catch(function (error) {
        console.log(error);
      });
  };

  if (!socket && wsError) {
    return (
      <d className="bg-[#212121] w-screen h-screen flex flex-col justify-center items-center text-white">
        {`We're`} having trouble connecting right now. Please check your internet connection and try again later
      </d>
    );
  }
  const content = msgs?.map((msg, i) => {
    return (
      <div key={i} className="text-white">
        {msg?.message?.content}
      </div>
    );
  });

  const dataInputs = [
    {
      name: "username",
      placeholder: "USERNAME",
    },
    {
      name: "name",
      placeholder: "NAME",
    },
    {
      name: "email",
      placeholder: "EMAIL",
    },
    {
      name: "password",
      placeholder: "PASSWORD",
    },
  ];
  const Input = dataInputs.map((data, i) => {
    return (
      <div key={i}>
        <input
          key={i}
          className="w-48 px-1 text-base m-2 bg-gray-100 rounded-md "
          name={data.name}
          type="text"
          placeholder={data.placeholder}
        />
      </div>
    );
  });

  let users;
  if (!isError && isSuccess) {
    users = <Connections data={data} />
  }

  return (
    <div className="bg-[#212121] w-screen h-screen flex flex-col justify-center items-center">
      <form
        onSubmit={handleSubmit}
        className="flex flex-row justify-center items-center"
      >
        {Input}
        <button className="px-2 bg-gray-300 text-base text-black rounded-md ">
          JOIN
        </button>
      </form>
      <div className="flex flex-row items-center">
        <div>
          {users}
        </div>
        <div>
          {content}
          <input
            className="w-48 px-1 text-base m-2 bg-gray-100 rounded-md"
            type="text"
            onChange={(e) => setNewMsg(e.target.value)}
            value={newMsg}
            placeholder="Send Msg..."
          />
          <button
            className="px-2 bg-gray-300 text-base text-black rounded-md"
            onClick={handleSendMSG}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
