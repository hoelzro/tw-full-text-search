TSC=tsc
TSCFLAGS=--pretty --lib ES2015 --module commonjs --alwaysStrict --noEmitOnError

JS_FILES=$(shell ls *.ts | perl -npe 's/[.]ts$$/.js/')

all: $(JS_FILES)

clean:
	rm -f $(JS_FILES)

%.js: %.ts
	$(TSC) $(TSCFLAGS) $^
