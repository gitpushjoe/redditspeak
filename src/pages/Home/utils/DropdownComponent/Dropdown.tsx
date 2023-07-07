export function DropdownOption(value: string, name: string) {
    return {value, name};
}

type DropdownOptionType = ReturnType<typeof DropdownOption>;

export function Dropdown(props: { options: DropdownOptionType[], setSelected: Function, buttonText: any, dropdownSize?: 'sm'|'lg'|'', useOptionsForButtonText?: boolean}) {
    const {options, setSelected} = props;
    const dropdownSize = props.dropdownSize || '';
    const useOptionsForButtonText = props.useOptionsForButtonText || false;
    const buttonText = useOptionsForButtonText ? options.find(option => option.value === props.buttonText)?.name : props.buttonText;
    return <div className="dropdown fix-dropdown" style={{display: 'inline-block', borderRadius: '6px'}} >
    <button className={`btn btn-${dropdownSize} btn-info dropdown-toggle`} style={{paddingRight: '1em', margin: '0'}} type="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        {buttonText}
    </button>
    <div className="dropdown-menu" aria-labelledby="dropdownMenuButton">
        {
            options.map((option, index) => {
                return <a className="dropdown-item" href="#" key={index} onClick={() => setSelected(option.value)}>{option.name}</a>
            })
        }
    </div>
    </div>;
}