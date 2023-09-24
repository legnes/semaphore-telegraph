export function createSVGNode(tag, attributes) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const key in attributes) {
        node.setAttribute(key, attributes[key]);
    }
    return node;
}

export function mod(v, n) {
    return ((v % n) + n) % n;
}

const inputPanel = document.createElement("details");
inputPanel.style.position = "absolute";
inputPanel.style.top = "0";
inputPanel.style.left = "0";
inputPanel.style.margin = "4px";
const inputSummary = document.createElement("summary");
inputSummary.innerHTML = "Settings";
const inputContainer = document.createElement("div");
inputContainer.style.display = "flex";
inputContainer.style.flexDirection = "column";
inputPanel.appendChild(inputSummary);
inputPanel.appendChild(inputContainer);
document.body.appendChild(inputPanel);

export class InputControl {
    #type;
    #node;

    value;

    constructor(attributes, label, onChange) {
        if (attributes.type == null) {
            throw new Error("input control requires a type");
        }
        this.#type = attributes.type;

        // Input element
        const inputNode = document.createElement("input");
        for (const key in attributes) {
            inputNode.setAttribute(key, attributes[key]);
        }
        inputNode.style.margin = "4px";
        switch (this.#type) {
            case "number":
                inputNode.style.width = "4em";
                break;
            case "text":
                inputNode.style.width = "20em";
                break;
        }

        // Label element
        const labelNode = document.createElement("label");
        labelNode.innerHTML = label;
        labelNode.appendChild(inputNode);
        this.#node = labelNode;

        this.value = this.#getValue(inputNode);

        inputNode.addEventListener(this.#type === "button" ? "click" : "change", (evt) => {
            this.value = this.#getValue(evt.target);
            onChange?.();
        });

        this.#attach();
    }

    #attach() {
        inputContainer.appendChild(this.#node);
    }

    #getValue(inputNode) {
        switch (this.#type) {
            case "checkbox":
                return inputNode.checked;
            case "text":
                return inputNode.value;
            default:
                return +inputNode.value;
        }
    }
}
