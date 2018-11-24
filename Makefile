TSC=tsc
TSCFLAGS=--pretty --module commonjs --alwaysStrict --noEmitOnError
TSCLIBS=--lib esnext,dom

JS_FILES=$(shell ls *.ts | perl -npe 's/[.]ts$$/.js/')
TID_FILES=$(shell ls *.tid | fgrep -v fts.json.tid)
DEMO_FILES=$(shell ls demo/*.tid)
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
	cp $(DEMO_FILES) $</tiddlers/
	tiddlywiki $< --output $(shell pwd) --rendertiddler '$$:/core/save/all' /dev/null text/plain | perl -pnle 'if(/\d+\s+test.*(\d+)\s+failure/ && $$1 > 0) { $$failed = 1 } END { exit(1) if($$failed) }'

dist.html: .build-wiki $(JS_FILES) $(TID_FILES) $(DEMO_FILES) plugin.info
	mkdir -p $</plugins/full-text-search
	mkdir -p $</tiddlers
	cp $(JS_FILES) $</plugins/full-text-search
	cp $(TID_FILES) $</plugins/full-text-search
	cp $(DEMO_FILES) $</tiddlers/
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
	jq '(.plugins) |= . + ["hoelzro/jasmine3"]' .test-wiki/tiddlywiki.info > .test-wiki/tiddlywiki.info.tmp
	git clone https://github.com/hoelzro/tw-modern-jasmine .test-wiki/plugins/jasmine3
	(cd .test-wiki/plugins/jasmine3; npm install)
	mv .test-wiki/tiddlywiki.info.tmp .test-wiki/tiddlywiki.info

.build-wiki:
	tiddlywiki .build-wiki --init empty
	jq '(.plugins) |= . + ["tiddlywiki/github-fork-ribbon", "hoelzro/progress-bar", "hoelzro/full-text-search"]' .build-wiki/tiddlywiki.info > .build-wiki/tiddlywiki.info.tmp
	mv .build-wiki/tiddlywiki.info.tmp .build-wiki/tiddlywiki.info
	mkdir .build-wiki/plugins/
	git clone https://github.com/hoelzro/tw-progress-bar .build-wiki/plugins/progress-bar

plugin.info: plugin.info.in
	jq --arg version $(shell git describe) '.version |= $$version' $^ > $@

clean:
	rm -f $(JS_FILES) dist.html fts.json.tid plugin.info

realclean: clean
	rm -rf .build-wiki/ .test-wiki/

%.js: %.ts
	$(TSC) $(TSCFLAGS) $(TSCLIBS) $^

index-worker.js: index-worker.ts
	$(TSC) $(TSCFLAGS) --lib esnext,webworker,webworker.importscripts $^
