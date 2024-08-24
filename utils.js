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
inputPanel.open = false;
const inputSummary = document.createElement("summary");
inputSummary.innerHTML = "Settings";
const inputContainer = document.createElement("div");
inputContainer.style.display = "flex";
inputContainer.style.flexDirection = "column";
inputPanel.appendChild(inputSummary);
inputPanel.appendChild(inputContainer);
document.body.appendChild(inputPanel);

export class InputSection {
    constructor(name, options) {
        const separatorNode = document.createElement("hr");
        separatorNode.style = "width: 100%;";
        const headerNode = document.createElement("strong");
        headerNode.innerHTML = name;
        if (options?.delimit !== false) {
            inputContainer.appendChild(separatorNode);
        }
        inputContainer.appendChild(headerNode);
    }
}

export class InputControl {
    #type;
    #node;
    #inputNode;

    value;

    constructor(attributes, label, onChange) {
        const { type } = attributes;
        if (type == null) {
            throw new Error("input control requires a type");
        }
        this.#type = type;

        // Element (input or select)
        let inputNode;
        if (type === "select") {
            inputNode = document.createElement("select");
            const options = attributes.options;
            for (const option of options) {
                const optionNode = document.createElement("option");
                optionNode.value = option;
                optionNode.innerHTML = option;
                inputNode.appendChild(optionNode);
            }
            inputNode.value = attributes.value;
            delete attributes.options;
            delete attributes.value;
        } else {
            inputNode = document.createElement("input");
        }
        this.#inputNode = inputNode;

        // Attributes and sytle
        for (const key in attributes) {
            inputNode.setAttribute(key, attributes[key]);
        }
        inputNode.style.margin = "4px";
        switch (type) {
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
            this.value = this.#getValue();
            onChange?.();
        });

        this.#attach();
    }

    #attach() {
        inputContainer.appendChild(this.#node);
    }

    #getValue() {
        switch (this.#type) {
            case "checkbox":
                return this.#inputNode.checked;
            case "text":
            case "select":
                return this.#inputNode.value;
            default:
                return +this.#inputNode.value;
        }
    }

    enable() {
        this.#inputNode.disabled = false;
    }

    disable() {
        this.#inputNode.disabled = true;
    }
}
