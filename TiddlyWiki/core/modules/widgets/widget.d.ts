declare module "$:/core/modules/widgets/widget.js" {
    export class widget {
      wiki: any;

      initialise(parseTreeNode : any, options: any) : void;
      computeAttributes() : any;
      refreshChildren(changedTiddlers : any) : any;
      getAttribute(name : string, defaultText? : string) : string;
    }
}
