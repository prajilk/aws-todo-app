import { useEffect, useState } from "react";
import axios from "./axios.config";

function App() {
    const [todos, setTodos] = useState<
        { id: number; todo: string; completed: boolean }[]
    >([]);
    const [newTodo, setNewTodo] = useState("");

    useEffect(() => {
        async function getTodo() {
            try {
                const { data } = await axios.get("/");
                setTodos(data.todos);
            } catch (error: any) {
                alert(error.message);
            }
        }
        getTodo();
    }, []);

    async function addTodo(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const response = await axios.post("/add-todo", {
            todo: newTodo,
        });
        setTodos([...todos, response.data.todo]);
        setNewTodo("");
    }

    return (
        <div className="min-h-screen bg-gray-800 flex items-center pt-10 flex-col px-2">
            <h1 className="text-white mb-5 font-semibold text-xl">
                Simple TODO Demo
            </h1>
            <div className="p-5 w-full rounded-xl md:min-w-[400px] bg-gray-700 h-fit">
                <form onSubmit={addTodo} className="flex gap-3 items-center">
                    <input
                        type="text"
                        className="w-full py-1 rounded-md"
                        value={newTodo}
                        onChange={(e) => setNewTodo(e.target.value)}
                    />
                    <button className="px-2 py-1 rounded-md bg-indigo-500 text-white">
                        Add
                    </button>
                </form>
                <div className="my-5">
                    <ul>
                        {todos.map((todo, i) => (
                            <TodoList {...todo} key={i} setTodos={setTodos} />
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default App;

function TodoList({
    id,
    todo,
    completed,
    setTodos,
}: {
    id: number;
    todo: string;
    completed: boolean;
    setTodos: React.Dispatch<
        React.SetStateAction<
            {
                id: number;
                todo: string;
                completed: boolean;
            }[]
        >
    >;
}) {
    const [todoCompleted, setTodoCompleted] = useState(completed);

    async function updateTodo() {
        setTodoCompleted(!todoCompleted);
        await axios.patch("/update-todo", {
            todoId: id,
            completed: !todoCompleted,
        });
    }

    async function deleteTodo() {
        const { data } = await axios.delete(`/delete-todo/${id}`);
        if (data.deleted) {
            setTodos((prev) => prev.filter((prevTodo) => prevTodo.id !== id));
        }
    }

    return (
        <li className="flex gap-2 items-center">
            <input
                type="checkbox"
                checked={todoCompleted}
                onClick={updateTodo}
                id={id.toString()}
            />
            <label
                htmlFor={id.toString()}
                className={`text-white ${todoCompleted && "line-through"}`}
            >
                {todo}
            </label>
            <button
                className="text-red-500 text-sm underline ms-auto"
                onClick={deleteTodo}
            >
                Delete
            </button>
        </li>
    );
}
