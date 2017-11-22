TSC=tsc
TSCFLAGS=--pretty --module commonjs --alwaysStrict --noEmitOnError
TSCLIBS=--lib esnext,dom

JS_FILES=$(shell ls *.ts | perl -npe 's/[.]ts$$/.js/')
TID_FILES=$(shell ls *.tid)
TEST_FILES=$(shell ls tests/*.js)

all: fts.html

# XXX not running tests here would be great, if I could make a "make test"
fts.html: .build-wiki $(JS_FILES) $(TID_FILES) $(TEST_FILES) plugin.info
	mkdir -p .build-wiki/plugins/full-text-search
	mkdir -p .build-wiki/tiddlers/tests
	cp *.js .build-wiki/plugins/full-text-search
	cp *.tid .build-wiki/plugins/full-text-search
	cp *.info .build-wiki/plugins/full-text-search
	cp -R files/ .build-wiki/plugins/full-text-search
	cp -R tests/ .build-wiki/tiddlers/tests/
	tiddlywiki .build-wiki --output $(shell pwd) --rendertiddler '$$:/core/save/all' $@ text/plain

fts.json.tid: fts.html
	tiddlywiki 	    \
	    --load fts.html \
	    --output $(shell pwd) \
	    --rendertiddler '$$:/plugins/hoelzro/full-text-search' $@ text/plain '$$:/core/templates/exporters/TidFile' 'exportFilter' '$$:/plugins/hoelzro/full-text-search'

.build-wiki:
	tiddlywiki .build-wiki --init empty
	jq '(.plugins) |= . + ["hoelzro/progress-bar", "hoelzro/full-text-search", "tiddlywiki/jasmine"]' .build-wiki/tiddlywiki.info > .build-wiki/tiddlywiki.info.tmp
	mv .build-wiki/tiddlywiki.info.tmp .build-wiki/tiddlywiki.info
	mkdir .build-wiki/plugins/
	git clone https://github.com/hoelzro/tw-progress-bar .build-wiki/plugins/progress-bar

clean:
	rm -f $(JS_FILES) fts.html

realclean: clean
	rm -rf .build-wiki/

%.js: %.ts
	$(TSC) $(TSCFLAGS) $(TSCLIBS) $^

index-worker.js: index-worker.ts
	$(TSC) $(TSCFLAGS) --lib esnext,webworker $^
