package chat

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"

	"github.com/Joepolymath/DaVinci/apps/scribequery/internal/domain/chat"
	"github.com/Joepolymath/DaVinci/apps/scribequery/internal/handlers"
	"github.com/Joepolymath/DaVinci/libs/shared-go/infra/ai"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	service chat.Service
	env     *handlers.Environment
}

func (h *Handler) Init(basePath string, env *handlers.Environment) error {
	h.env = env
	h.service = env.Services.ChatService

	group := env.Fiber.Group(basePath + "/chats")

	group.Post("/", h.chat)
	group.Post("/stream", h.chatStream)

	return nil
}

func (h *Handler) chat(c *fiber.Ctx) error {
	var request ai.Message
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	response, err := h.service.Chat(c.Context(), []ai.Message{request})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to chat",
		})
	}

	return c.JSON(response)
}

func (h *Handler) chatStream(c *fiber.Ctx) error {
	var request ai.Message
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	messages := []ai.Message{request}

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Transfer-Encoding", "chunked")

	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		ctx := context.Background()

		err := h.service.ChatStream(ctx, messages, func(delta ai.ChatStreamDelta) error {
			data, err := json.Marshal(delta)
			if err != nil {
				return err
			}

			if _, err := fmt.Fprintf(w, "data: %s\n\n", data); err != nil {
				return err
			}

			return w.Flush()
		})

		if err != nil {
			errData, _ := json.Marshal(fiber.Map{"error": err.Error()})
			fmt.Fprintf(w, "event: error\ndata: %s\n\n", errData)
			w.Flush()
		}

		fmt.Fprintf(w, "data: [DONE]\n\n")
		w.Flush()
	})

	return nil
}
