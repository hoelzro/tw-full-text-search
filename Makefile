TSC=tsc
TSCFLAGS=--pretty --module commonjs --alwaysStrict --noEmitOnError
TSCLIBS=--lib esnext,dom

JS_FILES=$(shell ls *.ts | perl -npe 's/[.]ts$$/.js/')
TID_FILES=$(shell ls *.tid | fgrep -v fts.json.tid)
TEST_FILES=$(shell ls tests/*.js)

all: dist.html fts.json.tid

test: .test-wiki $(JS_FILES) $(TID_FILES) $(TEST_FILES) plugin.info
	mkdir -p $</plugins/full-text-search
	mkdir -p $</tiddlers/tests
	cp *.js $</plugins/full-text-search
	cp $(TID_FILES) $</plugins/full-text-search
	cp *.info $</plugins/full-text-search
	cp -R files/ $</plugins/full-text-search
	cp -R tests/ $</tiddlers/tests/
	tiddlywiki $< --output $(shell pwd) --rendertiddler '$$:/core/save/all' $@ text/plain

dist.html: .build-wiki $(JS_FILES) $(TID_FILES) plugin.info
	mkdir -p $</plugins/full-text-search
	cp *.js $</plugins/full-text-search
	cp $(TID_FILES) $</plugins/full-text-search
	cp *.info $</plugins/full-text-search
	cp -R files/ $</plugins/full-text-search
	tiddlywiki $< --output $(shell pwd) --rendertiddler '$$:/core/save/all' $@ text/plain

fts.json.tid: dist.html
	tiddlywiki 	          \
	    --load $<             \
	    --output $(shell pwd) \
	    --rendertiddler '$$:/plugins/hoelzro/full-text-search' $@ text/plain '$$:/core/templates/exporters/TidFile' 'exportFilter' '$$:/plugins/hoelzro/full-text-search'

.test-wiki: .build-wiki
	cp -R .build-wiki/ .test-wiki/
	jq '(.plugins) |= . + ["tiddlywiki/jasmine"]' .test-wiki/tiddlywiki.info > .test-wiki/tiddlywiki.info.tmp
	mv .test-wiki/tiddlywiki.info.tmp .test-wiki/tiddlywiki.info

.build-wiki:
	tiddlywiki .build-wiki --init empty
	jq '(.plugins) |= . + ["hoelzro/progress-bar", "hoelzro/full-text-search"]' .build-wiki/tiddlywiki.info > .build-wiki/tiddlywiki.info.tmp
	mv .build-wiki/tiddlywiki.info.tmp .build-wiki/tiddlywiki.info
	mkdir .build-wiki/plugins/
	git clone https://github.com/hoelzro/tw-progress-bar .build-wiki/plugins/progress-bar

clean:
	rm -f $(JS_FILES) fts.html fts.json.tid

realclean: clean
	rm -rf .build-wiki/ .test-wiki/

%.js: %.ts
	$(TSC) $(TSCFLAGS) $(TSCLIBS) $^

index-worker.js: index-worker.ts
	$(TSC) $(TSCFLAGS) --lib esnext,webworker,webworker.importscripts $^
