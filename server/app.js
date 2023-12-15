const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient()
const app = express();

app.use(express.json());
app.use(cors());

app.get('/api', async (req, res) => {
    const todos = await db.todos.findMany()
    res.status(200).json({ todos })
})

app.post('/api/add-todo', async (req, res) => {
    const { todo } = req.body
    const addTodo = await db.todos.create({
        data: {
            todo: todo,
        }
    })
    res.status(200).json({ todo: addTodo })
})

app.patch("/api/update-todo", async (req, res) => {
    const { todoId, completed } = req.body
    const updatedTodo = await db.todos.update({
        where: {
            id: todoId
        },
        data: {
            completed
        }
    })
    res.status(200).json({ todo: updatedTodo })
})

app.delete("/api/delete-todo/:id", async (req, res) => {
    const { id } = req.params
    await db.todos.delete({
        where: {
            id: Number(id),
        }
    })
    res.status(200).json({ deleted: true })
})

const PORT = process.env.PORT || 5000;
app.listen(PORT, console.log(`Server running on Port: ${PORT}`));