#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
pub mod astar_debug {

    #[ink(event)]
    pub struct ValueUpdated {
        value: u128,
    }

    /// Errors occurred in the contract
    #[derive(Debug, Eq, PartialEq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum ContractError {
        AddOverFlow,
    }

    // Contract storage
    #[ink(storage)]
    #[derive(Default)]
    pub struct Contract {
        value: u128,
    }

    impl Contract {
        #[ink(constructor)]
        pub fn new() -> Self {
            Self::default()
        }

        #[ink(message)]
        pub fn inc(&mut self) -> Result<(), ContractError> {
            self.value = self.value
                .checked_add(1)
                .ok_or(ContractError::AddOverFlow)?;

            // emmit the event
            self.env().emit_event(ValueUpdated {
                value: self.value,
            });

            Ok(())
        }

        #[ink(message)]
        pub fn get_value(&self) -> u128 {
            self.value
        }
    }
}
