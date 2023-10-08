package providers

import (
    "github.com/novuhq/novu/providers/model"
)

var providers = []model.Provider{
	{
			Name: "matrix",
			Type: "matrix",
			Handler: &matrix.MatrixProviderHandler{},
			Config: &matrix.MatrixConfig{},
	},
}