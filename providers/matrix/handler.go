package matrix

import (
"encoding/json"
"fmt"
"github.com/novuhq/novu/providers/model"
"net/http"
)

type MatrixProviderHandler struct {
homeserverURL string
accessToken  string
}

func NewMatrixProviderHandler(homeserverURL, accessToken string) *MatrixProviderHandler {
return &MatrixProviderHandler{
homeserverURL: homeserverURL,
accessToken:  accessToken,
}
}

func (h *MatrixProviderHandler) SendNotification(notification *model.Notification) error {
// Create a new Matrix notification.
matrixNotification := MatrixNotification{
MsgType: "m.room.message",
Content: model.Content{
Body: notification.Message,
},
}

// Create a new HTTP request to send the notification.
request, err := http.NewRequest("POST", h.homeserverURL+"/api/v1/rooms/"+notification.To+"/send", nil)
if err != nil {
    return err
}

// Set the request headers.
request.Header.Set("Authorization", "Bearer "+h.accessToken)
request.Header.Set("Content-Type", "application/json")

// Marshal the Matrix notification to JSON.
jsonBytes, err := json.Marshal(matrixNotification)
if err != nil {
    return err
}

// Set the request body.
request.Body = jsonBytes

// Send the request.
client := &http.Client{}
response, err := client.Do(request)
if err != nil {
    return err
}

// Check the response status code.
if response.StatusCode != 200 {
    return fmt.Errorf("failed to send Matrix notification: %s", response.Status)
}

// Close the response body.
defer response.Body.Close()

return nil
}

func (h *MatrixProviderHandler) GetNotificationStatus(notificationID string) (model.Status, error) {
    // Construct the request URL.
    url := fmt.Sprintf("%s/api/v1/rooms/%s/notifications/%s", h.homeserverURL, notificationID)
  
    // Create a new HTTP client.
    client := &http.Client{}
  
    // Create a new HTTP request.
    request, err := http.NewRequest("GET", url, nil)
    if err != nil {
      return model.StatusPending, err
    }
  
    // Set the request headers.
    request.Header.Set("Authorization", "Bearer "+h.accessToken)
  
    // Send the request.
    response, err := client.Do(request)
    if err != nil {
      return model.StatusPending, err
    }
  
    // Close the response body.
    defer response.Body.Close()
  
    // Check the response status code.
    if response.StatusCode != 200 {
      return model.StatusPending, fmt.Errorf("failed to get notification status: %s", response.Status)
    }
  
    // Decode the response body.
    var notificationStatus model.Status
    err = json.NewDecoder(response.Body).Decode(&notificationStatus)
    if err != nil {
      return model.StatusPending, err
    }
  
    // Return the notification status.
    return notificationStatus, nil
  }

func (h *MatrixProviderHandler) CancelNotification(notificationID string) error {
    // Construct the request URL.
    url := fmt.Sprintf("%s/api/v1/rooms/%s/notifications/%s", h.homeserverURL, notificationID)
  
    // Create a new HTTP client.
    client := &http.Client{}
  
    // Create a new HTTP request.
    request, err := http.NewRequest("DELETE", url, nil)
    if err != nil {
      return err
    }
  
    // Set the request headers.
    request.Header.Set("Authorization", "Bearer "+h.accessToken)
  
    // Send the request.
    response, err := client.Do(request)
    if err != nil {
      return err
    }
  
    // Close the response body.
    defer response.Body.Close()
  
    // Check the response status code.
    if response.StatusCode != 200 {
      return fmt.Errorf("failed to cancel notification: %s", response.Status)
    }
  
    // Return nil if the request was successful.
    return nil
  }
