package chat

import (
	"context"

	"github.com/Joepolymath/DaVinci/libs/shared-go/infra/ai"
)

type Service interface {
	Chat(ctx context.Context, messages []ai.Message) (ai.ChatResponse, error)
	ChatStream(ctx context.Context, messages []ai.Message, onDelta func(delta ai.ChatStreamDelta) error) error
}
