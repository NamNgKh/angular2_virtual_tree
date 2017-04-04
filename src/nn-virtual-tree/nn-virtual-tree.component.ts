import { Component, OnInit, HostBinding, Input, HostListener, ViewChild, ElementRef, EventEmitter, ContentChild, TemplateRef, Output } from '@angular/core';
import { TreeNode } from './tree-node';
import { InternalTreeNode } from './internal-tree-node';

@Component({
  selector: 'nn-virtual-tree',
  templateUrl: './nn-virtual-tree.component.html',
  styleUrls: ['./nn-virtual-tree.component.css']
})
export class NNVirtualTreeComponent implements OnInit {

  @Input() width: number;
  @Input() private selectParent: boolean = false;
  @Input() private lazyLoading = false;
  @Input() loadingText: string = "Loading...";
  @Input() loadingIcon: string = "../../assets/icons/loading.gif";
  @Input() private showRoot: boolean = true;
  @Input() private height: number = 100;
  @Output() changeselection: EventEmitter<InternalTreeNode> = new EventEmitter();
  @Output() openNode = new EventEmitter<InternalTreeNode>();
  @Output() closeNode = new EventEmitter<InternalTreeNode>();
  @ContentChild("nnTreeItem") nnTreeItem: TemplateRef<any>;
  @ContentChild("nnTreeToogleIcon") nnTreeToogleIcon: TemplateRef<any>;
  @ViewChild("container") private container: ElementRef;

  private renderNodes: Array<InternalTreeNode> = [];
  private displayNodes: Array<InternalTreeNode> = [];
  private orginalNodes: Array<InternalTreeNode> = [];
  private itemHeight: number = 20;
  private itemsPerViewport: number = 5;
  private startIndex: number = 0;
  private actualHeight: number = 0;
  private selectedNode: InternalTreeNode = null;
  private filterText: string = "";
  private paddingLeft = 20;
  private numDisplayItems = 0;
  private _root: InternalTreeNode;
  private _index = 0;

  constructor() { }

  ngOnInit() { }

  @Input()
  set root(root: InternalTreeNode) {
    if (this._root !== root) {
      this._root = root;
      root.display = this.showRoot;
      this.initTreeData(root, 0);
      this.actualHeight = this.displayNodes.length * this.itemHeight;
      this.itemsPerViewport = Math.floor(this.height / this.itemHeight) + 2;
      this.renderNodes = new Array<InternalTreeNode>(this.itemsPerViewport);
      this.refresh(true);
    }
  }

  private initTreeData(node: InternalTreeNode, level: number) {
    node.left = level * this.paddingLeft - (!this.showRoot ? this.paddingLeft : 0);
    node.level = level;
    node.showToogleIcon = node.lazyLoading ? true : (node.children && node.children.length > 0) ? true : false;
    if (node.display) {
      this.displayNodes.push(node);
    }
    this.orginalNodes.push(node);
    if (node.children && node.children.length)
      node.children.forEach(n => {
        n.display = node.open;
        this.initTreeData(n, level + 1);
      });
  }

  private refresh(force?: boolean) {
    var showFromIndex = Math.floor(this.container.nativeElement.scrollTop / this.itemHeight);
    if (this.startIndex != showFromIndex || force) {
      this.startIndex = force ? this.startIndex : showFromIndex;
      let count = 0;
      for (let i = this.startIndex; i < this.displayNodes.length && count < this.renderNodes.length; i++) {
        this.renderNodes[count] = this.displayNodes[i];
        this.renderNodes[count].index = i;
        this.renderNodes[count].top = 0;
        count++;
      }
      this.renderNodes[0].top = this.startIndex * this.itemHeight;
      this.numDisplayItems = count;
    }
  }

  private onClickToogleIcon(node: InternalTreeNode) {
    node.open = !node.open;
    node.open ? this.onOpenNode(node) : this.onCloseNode(node);
  }

  private onOpenNode(node: InternalTreeNode) {
    node.open = true;
    if (!this.lazyLoading) {
      this.addRenderedChildren(node, node.children);
    }
    this.openNode.emit(node);
  }

  private onCloseNode(node: InternalTreeNode) {
    node.open = false;
    node.children.forEach(x => x.display = false);
    this.removeRenderedChildren(node);
    this.closeNode.emit(node);
  }

  private onClickItem(node: InternalTreeNode) {
    if (node.children && node.children.length > 0 && !this.selectParent) {
      return;
    }
    if (this.selectedNode != node) {
      if (this.selectedNode)
        this.selectedNode.selected = false;
      this.selectedNode = node;
      this.selectedNode.selected = true;
      this.changeselection.emit(node);
    }
  }

  private onDblclickItem(node: InternalTreeNode) {
    if (node.children && node.children.length)
      this.onClickToogleIcon(node);
  }

  filter(text: string) {
    this.filterText = text;
    this.displayNodes = [];
    let indexs = [];
    let currentLevel = 0;
    for (let i = this.orginalNodes.length - 1; i >= 0; i--) {
      let node = this.orginalNodes[i];
      if (node.label.search(text) >= 0) {
        if (node.display)
          indexs.push(i);
        currentLevel = node.level;
      }
      else {
        if (node.level < currentLevel) {
          if (node.display)
            indexs.push(i);
          currentLevel = node.level;
        }
      }
    }

    this.displayNodes = new Array(indexs.length);
    let count = 0;
    for (let i = indexs.length - 1; i >= 0; i--) {
      if (this.orginalNodes[indexs[i]].display)
        this.displayNodes[count++] = this.orginalNodes[indexs[i]];
    }
    this.actualHeight = this.displayNodes.length * this.itemHeight;
    this.refresh(true);
  }

  showLoading(node: InternalTreeNode) {
    node.children = [];
    this.removeRenderedChildren(node);
    let n = new InternalTreeNode();
    n.open = true;
    n.loading = true;
    this.addRenderedChildren(node, [n]);
  }

  hideLoading(node: InternalTreeNode) {
    this.removeRenderedChildren(node);
    node.children = [];
  }

  private addRenderedChildren(node: InternalTreeNode, children: InternalTreeNode[], noRefresh?: boolean) {
    node.children = children;
    this._index = node.index;
    let count = 0;
    if (children && children.length) {
      children.forEach((x, i) => {
        this._index++;
        x.display = node.open;
        x.level = node.level + 1;
        x.index = this._index;
        x.left = node.left + this.paddingLeft;
        x.top = node.top + (count + 1) * this.itemHeight;
        if (x.loading || (x.label != undefined && x.label.search(this.filterText)) >= 0) {
          this.displayNodes.splice(x.index, 0, x);
          this.actualHeight += this.itemHeight;
        }
        if (x.open && x.children && x.children.length) {
          this.addRenderedChildren(x, x.children, true);
        }
      });
    }

    if (!noRefresh)
      this.refresh(true);
  }

  private removeRenderedChildren(node: InternalTreeNode) {
    let count = 0;
    for (let i = node.index + 1; i < this.displayNodes.length; i++) {
      if (node.level < this.displayNodes[i].level)
        count++;
      else
        break;
    }
    this.actualHeight -= count * this.itemHeight;
    this.displayNodes.splice(node.index + 1, count);
    this.refresh(true);
  }

  addNodeChildren(node: InternalTreeNode, children: InternalTreeNode[]) {
    if(children){
      children.forEach(n => {
        n.showToogleIcon = n.lazyLoading ? true : (n.children && n.children.length > 0) ? true : false;
      });
    }
    this.addRenderedChildren(node, children);
  }

  removeNodeChildren(node: InternalTreeNode) {
    node.children = [];
    this.removeRenderedChildren(node);
  }
}
