FROM golang:1.23

WORKDIR /usr/src/app

COPY go.mod go.sum ./
RUN go mod download && go mod verify
COPY . .
COPY *testdata /usr/local/bin/testdata
RUN go build -v -o /usr/local/bin/mockserver .
EXPOSE 18080
ENTRYPOINT ["mockserver"]
