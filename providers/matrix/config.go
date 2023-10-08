package matrix

type MatrixConfig struct {
    HomeserverURL string `json:"homeserver_url"`
    AccessToken  string `json:"access_token"`
}

func (c *MatrixConfig) Validate() error {
    if c.HomeserverURL == "" {
        return fmt.Errorf("homeserver_url is required")
    }

    if c.AccessToken == "" {
        return fmt.Errorf("access_token is required")
    }

    return nil
}   
