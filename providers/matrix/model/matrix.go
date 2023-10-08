package model

type MatrixNotification struct {
    MsgType string `json:"msgtype"`
    Content model.Content `json:"content"`
}