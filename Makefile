TSC=tsc
TSCFLAGS=--pretty --lib ES2015 --module commonjs --alwaysStrict

JS_FILES=$(shell ls *.ts | perl -npe 's/[.]ts$$/.js/')

all: $(JS_FILES)

clean:
	rm -f $(JS_FILES)

%.js: %.ts
	@# for some reason, TypeScript appears to write the file out anyway?
	$(TSC) $(TSCFLAGS) $^ || rm -f $@
