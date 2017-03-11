TSC=tsc
TSCFLAGS=--pretty --lib ES2015 --module commonjs --alwaysStrict

all: test.js

clean:
	rm -f test.js # XXX FIXME

%.js: %.ts
	@# for some reason, TypeScript appears to write the file out anyway?
	$(TSC) $(TSCFLAGS) $^ || rm -f $@
