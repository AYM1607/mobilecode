import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface Todo {
  id: string
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: string
}

interface TodoToolProps {
  todos?: Todo[]
}

export const TodoTool: React.FC<TodoToolProps> = ({ todos = [] }) => {
  const renderTodo = (todo: Todo) => {
    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'completed':
          return '✅'
        case 'in_progress':
          return '🔄'
        case 'cancelled':
          return '❌'
        default:
          return '⬜'
      }
    }

    const getStatusStyle = (status: string) => {
      switch (status) {
        case 'completed':
          return styles.completedTodo
        case 'in_progress':
          return styles.inProgressTodo
        case 'cancelled':
          return styles.cancelledTodo
        default:
          return styles.pendingTodo
      }
    }

    return (
      <View key={todo.id} style={styles.todoItem}>
        <Text style={styles.statusIcon}>{getStatusIcon(todo.status)}</Text>
        <Text style={[styles.todoText, getStatusStyle(todo.status)]}>
          {todo.content}
        </Text>
      </View>
    )
  }

  if (todos.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No todos</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Todo List</Text>
      {todos.map(renderTodo)}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2d2d30',
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
    marginVertical: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  statusIcon: {
    fontSize: 14,
    marginRight: 8,
    marginTop: 2,
  },
  todoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  pendingTodo: {
    color: '#ffffff',
  },
  inProgressTodo: {
    color: '#ffffff',
    fontWeight: '600',
  },
  completedTodo: {
    color: '#4caf50',
    textDecorationLine: 'line-through',
  },
  cancelledTodo: {
    color: '#888888',
    textDecorationLine: 'line-through',
    fontStyle: 'italic',
  },
  emptyText: {
    color: '#888888',
    fontStyle: 'italic',
  },
})