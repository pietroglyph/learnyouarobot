package main

import (
	"log"
	"net/http"

	flag "github.com/ogier/pflag"
)

func main() {
	bind := flag.StringP("bind", "b", "localhost:8000", "Address to run the webserver on.")
	staticDir := flag.StringP("static", "s", "static", "Path to static files to serve on /.")

	http.Handle("/", http.FileServer(http.Dir(*staticDir)))

	log.Println("Listening on", *bind)
	log.Panicln(http.ListenAndServe(*bind, nil))
}
