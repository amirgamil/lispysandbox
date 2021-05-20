package lispysandbox

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/amirgamil/lispy/pkg/lispy"
	"github.com/gorilla/mux"
)

func check(e error) {
	if e != nil {
		panic(e)
	}
}

func evaluateCode(source string) string {
	result, err := lispy.EvalSource(source)
	fmt.Println(result)
	if err != nil {
		result = make([]string, 0)
	}
	return strings.Join(result, "\n")
}

func runCode(w http.ResponseWriter, r *http.Request) {
	var source string
	err := json.NewDecoder(r.Body).Decode(&source)
	check(err)
	output := evaluateCode(source)
	json.NewEncoder(w).Encode(output)
}

func index(w http.ResponseWriter, r *http.Request) {
	indexFile, err := os.Open("./static/index.html")
	if err != nil {
		io.WriteString(w, "error reading index")
		return
	}
	defer indexFile.Close()

	io.Copy(w, indexFile)
}

func StartServer() {
	r := mux.NewRouter()

	srv := &http.Server{
		Handler:      r,
		Addr:         "127.0.0.1:8998",
		WriteTimeout: 60 * time.Second,
		ReadTimeout:  60 * time.Second,
	}

	r.HandleFunc("/", index)
	r.Methods("POST").Path("/code").HandlerFunc(runCode)
	r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("./static"))))
	log.Printf("Server listening on %s\n", srv.Addr)
	log.Fatal(srv.ListenAndServe())

}
