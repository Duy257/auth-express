import baseController from "./base";
import address from "../model/address";

class AddressController extends baseController {
  constructor(model: any) {
    super(model);
  }
}

export default new AddressController(address);
